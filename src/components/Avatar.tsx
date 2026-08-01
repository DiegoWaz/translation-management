import { initials } from '../helpers/format'

const AVATAR_COLORS = ['#3b4fd8', '#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706']

const avatarColor = (name: string) => {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export const Avatar = ({ name, size = 20 }: { name: string; size?: number }) => {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-fg-on-brand shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  )
}
