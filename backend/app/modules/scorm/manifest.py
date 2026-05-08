from xml.etree import ElementTree as etree


def _strip_ns(text: str) -> str:
    if text.startswith("{") and "}" in text:
        return text.split("}", 1)[1]
    return text


def _all_elements(root: etree.Element) -> list[etree.Element]:
    stack = [root]
    elements: list[etree.Element] = []
    while stack:
        node = stack.pop()
        elements.append(node)
        stack.extend(list(node))
    return elements


def _text(root: etree.Element, tag_local: str, default: str = "") -> str:
    for child in _all_elements(root):
        if _strip_ns(child.tag).lower() == tag_local.lower() and child.text:
            value = child.text.strip()
            if value:
                return value
    return default


def _attr(element: etree.Element, key: str) -> str:
    for attr_key, value in element.attrib.items():
        if _strip_ns(attr_key).lower() == key.lower():
            return value
    return ""


def _collect_resources(root: etree.Element) -> dict[str, dict]:
    resources: dict[str, dict] = {}
    for element in _all_elements(root):
        if _strip_ns(element.tag).lower() != "resource":
            continue

        resource_id = _attr(element, "identifier")
        if not resource_id:
            continue

        files = []
        dependencies = []
        for child in list(element):
            child_tag = _strip_ns(child.tag).lower()
            if child_tag == "file":
                href = _attr(child, "href")
                if href:
                    files.append(href)
            elif child_tag == "dependency":
                identifier_ref = _attr(child, "identifierref")
                if identifier_ref:
                    dependencies.append(identifier_ref)

        resources[resource_id] = {
            "identifier": resource_id,
            "type": _attr(element, "type"),
            "href": _attr(element, "href"),
            "scorm_type": _attr(element, "scormtype"),
            "files": files,
            "dependencies": dependencies,
        }
    return resources


def _organization_items(root: etree.Element) -> list[dict]:
    items: list[dict] = []
    for element in _all_elements(root):
        if _strip_ns(element.tag).lower() != "item":
            continue
        items.append(
            {
                "identifier": _attr(element, "identifier"),
                "identifierref": _attr(element, "identifierref"),
                "title": _text(element, "title"),
            }
        )
    return items


def parse_imsmanifest(xml_text: str) -> dict:
    """
    Parse imsmanifest.xml and return package metadata.
    Handles common SCORM 2004 and SCORM 1.2 namespace variants.
    """
    root = etree.fromstring(xml_text)
    title = _text(root, "title", "Untitled Package")
    schema = _text(root, "schema", "SCORM")
    schema_version = _text(root, "schemaversion", "")
    resources = _collect_resources(root)
    items = _organization_items(root)

    sco_launch = ""
    for item in items:
        identifier_ref = item.get("identifierref")
        if not identifier_ref:
            continue
        resource = resources.get(identifier_ref)
        if resource and resource.get("href"):
            sco_launch = resource["href"]
            break

    if not sco_launch:
        for resource in resources.values():
            if resource.get("href"):
                sco_launch = resource["href"]
                break

    return {
        "title": title,
        "schema": schema,
        "schema_version": schema_version,
        "sco_launch": sco_launch,
        "resources": list(resources.values()),
        "organizations": items,
    }
