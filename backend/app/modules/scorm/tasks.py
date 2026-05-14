import logging
import os
import posixpath
import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

from celery_app import celery_app
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import app.db.models  # noqa: F401
from app.core.config import settings
from app.core.storage import storage_service
from app.modules.scorm.model import ScormPackage
from app.shared.enums import ScormPackageStatus

logger = logging.getLogger(__name__)
_sync_engine = None
_sync_session_local = None


@dataclass
class ManifestInfo:
    title: str | None
    manifest_identifier: str | None
    organization_identifier: str | None
    schema_name: str | None
    schema_version: str | None
    launch_path: str
    launch_parameters: str | None


def _sync_database_url() -> str:
    url = settings.DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    return url


def _get_sync_session_factory():
    global _sync_engine, _sync_session_local
    if _sync_session_local is None:
        _sync_engine = create_engine(
            _sync_database_url(),
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        _sync_session_local = sessionmaker(
            bind=_sync_engine,
            expire_on_commit=False,
        )
    return _sync_session_local


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def _direct_child(element: ET.Element, name: str) -> ET.Element | None:
    for child in element:
        if _local_name(child.tag) == name:
            return child
    return None


def _direct_children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in element if _local_name(child.tag) == name]


def _child_text(element: ET.Element | None, name: str) -> str | None:
    if element is None:
        return None
    child = _direct_child(element, name)
    if child is None or child.text is None:
        return None
    value = child.text.strip()
    return value or None


def _attr_by_local_name(element: ET.Element, name: str) -> str | None:
    for attr_name, attr_value in element.attrib.items():
        if _local_name(attr_name) == name:
            return attr_value
    return None


def _normalize_relative_path(path: str) -> str:
    clean = path.replace("\\", "/").strip()
    clean = clean.split("#", 1)[0].split("?", 1)[0].lstrip("/")
    normalized = posixpath.normpath(clean)
    if normalized in ("", ".") or normalized.startswith("../") or normalized == "..":
        raise ValueError(f"Invalid SCORM launch path: {path}")
    return normalized


def _safe_zip_members(zip_file: zipfile.ZipFile) -> list[zipfile.ZipInfo]:
    files: list[zipfile.ZipInfo] = []
    total_size = 0
    for info in zip_file.infolist():
        name = info.filename.replace("\\", "/")
        if not name or name.startswith("/") or name.startswith("../") or "/../" in name:
            raise ValueError(f"Unsafe path in ZIP archive: {info.filename}")
        if info.is_dir():
            continue
        files.append(info)
        total_size += info.file_size
        if len(files) > settings.SCORM_MAX_EXTRACTED_FILES:
            raise ValueError(
                f"SCORM package contains more than {settings.SCORM_MAX_EXTRACTED_FILES} files"
            )
        if total_size > settings.SCORM_MAX_EXTRACTED_SIZE:
            max_mb = settings.SCORM_MAX_EXTRACTED_SIZE // (1024 * 1024)
            raise ValueError(f"SCORM package expands beyond {max_mb} MB")
    return files


def _extract_zip_safely(zip_path: str, extract_dir: str) -> list[zipfile.ZipInfo]:
    with zipfile.ZipFile(zip_path) as zf:
        files = _safe_zip_members(zf)
        root = Path(extract_dir).resolve()
        for info in files:
            target = (root / info.filename).resolve()
            if root not in target.parents and target != root:
                raise ValueError(f"Unsafe path in ZIP archive: {info.filename}")
        zf.extractall(extract_dir)
        return files


def _resource_scorm_type(resource: ET.Element) -> str | None:
    value = _attr_by_local_name(resource, "scormType")
    return value.lower() if value else None


def _resource_href(resource: ET.Element) -> str | None:
    href = resource.attrib.get("href")
    if href:
        return href
    return _attr_by_local_name(resource, "href")


def _parse_manifest(manifest_path: Path, extract_dir: Path) -> ManifestInfo:
    try:
        tree = ET.parse(manifest_path)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid imsmanifest.xml: {exc}") from exc

    root = tree.getroot()
    if _local_name(root.tag) != "manifest":
        raise ValueError("imsmanifest.xml root element must be <manifest>")

    metadata = _direct_child(root, "metadata")
    schema_name = _child_text(metadata, "schema")
    schema_version = _child_text(metadata, "schemaversion")
    version_text = (schema_version or "").lower()
    if "2004" not in version_text and "1.3" not in version_text:
        raise ValueError("Only SCORM 2004 packages are supported")

    organizations = _direct_child(root, "organizations")
    if organizations is None:
        raise ValueError("SCORM manifest does not contain organizations")

    resources_root = _direct_child(root, "resources")
    if resources_root is None:
        raise ValueError("SCORM manifest does not contain resources")

    resources_by_id = {
        resource.attrib.get("identifier"): resource
        for resource in _direct_children(resources_root, "resource")
        if resource.attrib.get("identifier")
    }
    if not resources_by_id:
        raise ValueError("SCORM manifest does not define launch resources")

    organization = None
    default_org_id = organizations.attrib.get("default")
    orgs = _direct_children(organizations, "organization")
    if default_org_id:
        organization = next(
            (org for org in orgs if org.attrib.get("identifier") == default_org_id),
            None,
        )
    if organization is None and orgs:
        organization = orgs[0]
    if organization is None:
        raise ValueError("SCORM manifest does not contain an organization")

    title = _child_text(organization, "title")
    launch_resource = None
    launch_parameters = None

    for item in organization.iter():
        if _local_name(item.tag) != "item":
            continue
        identifier_ref = item.attrib.get("identifierref")
        if not identifier_ref:
            continue
        resource = resources_by_id.get(identifier_ref)
        if resource is not None and _resource_href(resource):
            launch_resource = resource
            launch_parameters = item.attrib.get("parameters")
            break

    if launch_resource is None:
        launch_resource = next(
            (
                resource
                for resource in resources_by_id.values()
                if _resource_href(resource) and _resource_scorm_type(resource) in (None, "sco")
            ),
            None,
        )
    if launch_resource is None:
        raise ValueError("SCORM manifest does not contain a launchable SCO resource")

    href = _resource_href(launch_resource)
    if not href:
        raise ValueError("Launch resource is missing href")
    launch_path = _normalize_relative_path(href)
    if not (extract_dir / launch_path).is_file():
        raise ValueError(f"Launch file '{launch_path}' was not found in extracted package")

    return ManifestInfo(
        title=title,
        manifest_identifier=root.attrib.get("identifier"),
        organization_identifier=organization.attrib.get("identifier"),
        schema_name=schema_name,
        schema_version=schema_version,
        launch_path=launch_path,
        launch_parameters=launch_parameters,
    )


def _s3_prefix(package: ScormPackage) -> str:
    return f"Scorm/{package.sub_lesson_id}/{package.id}"


def _source_key(package: ScormPackage) -> str:
    safe_name = package.original_filename.replace("/", "_").replace("\\", "_")
    return f"{_s3_prefix(package)}/source/{safe_name}"


def _extracted_prefix(package: ScormPackage) -> str:
    return f"{_s3_prefix(package)}/extracted/"


def _upload_extracted_files(package: ScormPackage, extract_dir: Path) -> int:
    prefix = _extracted_prefix(package)
    files_count = 0
    for path in extract_dir.rglob("*"):
        if not path.is_file():
            continue
        rel_path = path.relative_to(extract_dir).as_posix()
        key = f"{prefix}{rel_path}"
        storage_service.upload_local_file(
            key=key,
            file_path=path,
            content_type=storage_service.guess_mime_type(rel_path),
        )
        files_count += 1
    return files_count


def _mark_failed(package_id: str, message: str) -> None:
    factory = _get_sync_session_factory()
    with factory() as db:
        result = db.execute(select(ScormPackage).where(ScormPackage.id == package_id))
        package = result.scalar_one_or_none()
        if not package:
            return
        package.status = ScormPackageStatus.FAILED.value
        package.error_message = message[:4000]
        package.processed_at = datetime.now(timezone.utc)
        db.commit()


def _process_scorm_package(package_id: str, staged_file_path: str) -> None:
    extract_dir = Path(tempfile.mkdtemp(prefix=f"scorm-{package_id}-"))
    try:
        logger.info("[SCORM] Processing package %s from %s", package_id, staged_file_path)
        factory = _get_sync_session_factory()
        with factory() as db:
            result = db.execute(select(ScormPackage).where(ScormPackage.id == package_id))
            package = result.scalar_one_or_none()
            if not package:
                raise ValueError(f"SCORM package {package_id} was not found")

            if not os.path.exists(staged_file_path):
                raise ValueError("Staged SCORM ZIP was not found")

            package.status = ScormPackageStatus.PROCESSING.value
            package.error_message = None
            db.commit()

            source_key = _source_key(package)
            logger.info("[SCORM] Uploading source ZIP for package %s to %s", package_id, source_key)
            storage_service.upload_local_file(
                key=source_key,
                file_path=staged_file_path,
                content_type="application/zip",
            )
            package.source_key = source_key
            db.commit()

            _extract_zip_safely(staged_file_path, str(extract_dir))
            logger.info("[SCORM] Extracted package %s to %s", package_id, extract_dir)
            manifest_path = extract_dir / "imsmanifest.xml"
            if not manifest_path.is_file():
                raise ValueError("imsmanifest.xml must exist at the root of the SCORM ZIP")

            manifest = _parse_manifest(manifest_path, extract_dir)
            logger.info(
                "[SCORM] Parsed manifest for package %s: schema_version=%s launch_path=%s",
                package_id,
                manifest.schema_version,
                manifest.launch_path,
            )
            files_count = _upload_extracted_files(package, extract_dir)
            logger.info("[SCORM] Uploaded %s extracted files for package %s", files_count, package_id)

            package.extracted_prefix = _extracted_prefix(package)
            package.title = manifest.title or package.original_filename
            package.manifest_identifier = manifest.manifest_identifier
            package.organization_identifier = manifest.organization_identifier
            package.schema_name = manifest.schema_name
            package.schema_version = manifest.schema_version
            package.launch_path = manifest.launch_path
            package.launch_parameters = manifest.launch_parameters
            package.files_count = files_count
            package.status = ScormPackageStatus.READY.value
            package.error_message = None
            package.processed_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("[SCORM] Package %s is ready", package_id)
    except Exception as exc:
        logger.exception("[SCORM] Package %s failed", package_id)
        _mark_failed(package_id, str(exc))
        raise
    finally:
        shutil.rmtree(extract_dir, ignore_errors=True)
        if os.path.exists(staged_file_path):
            os.unlink(staged_file_path)


@celery_app.task(
    bind=True,
    max_retries=0,
    queue="scorm",
    time_limit=3600,
    soft_time_limit=3300,
)
def process_scorm_package_task(self, package_id: str, staged_file_path: str) -> bool:
    _process_scorm_package(package_id, staged_file_path)
    return True
