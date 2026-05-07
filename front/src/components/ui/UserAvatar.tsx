interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-8 h-8 text-sm',
};

export function UserAvatar({ name, size = 'md' }: UserAvatarProps) {
  const initials = name
    ? name.split(' ').slice(-1)[0]?.[0]?.toUpperCase() ?? '?'
    : '?';

  return (
    <div
      className={`rounded-full bg-blue-100 flex items-center justify-center shrink-0 ${SIZE_MAP[size]}`}
    >
      <span className="text-blue-700 font-semibold">{initials}</span>
    </div>
  );
}
