import { Aperture, Camera, PackageOpen } from 'lucide-react'
import { cn } from '../../lib/utils'

const artByCategory = {
  body: {
    icon: Camera,
    background:
      'radial-gradient(120% 100% at 20% 0%, rgba(116,164,142,0.35), transparent 55%), linear-gradient(145deg, #2a3a33 0%, #101c17 70%)',
    accent: '#9cc7b1',
    label: 'CAMERA BODY',
  },
  lens: {
    icon: Aperture,
    background:
      'radial-gradient(120% 100% at 25% 0%, rgba(219,178,112,0.35), transparent 55%), linear-gradient(145deg, #3c3022 0%, #19130d 72%)',
    accent: '#e0bd82',
    label: 'LENS',
  },
  accessory: {
    icon: PackageOpen,
    background:
      'radial-gradient(120% 100% at 20% 0%, rgba(143,158,169,0.32), transparent 55%), linear-gradient(145deg, #2b3338 0%, #11181b 72%)',
    accent: '#b8c6cf',
    label: 'ACCESSORY',
  },
} as const

export function GearArtwork({
  category,
  imageKey,
  name,
  className,
}: {
  category: string
  imageKey?: string | null
  name: string
  className?: string
}) {
  const art = artByCategory[category as keyof typeof artByCategory] ?? artByCategory.accessory
  const Icon = art.icon

  if (imageKey) {
    return (
      <div className={cn('relative overflow-hidden bg-[#101a16]', className)}>
        <img
          src={`/api/images/${encodeURIComponent(imageKey)}`}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      </div>
    )
  }

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ background: art.background }}
    >
      <div
        aria-hidden="true"
        className="absolute -right-8 -top-10 size-40 rounded-full border border-white/10"
        style={{ boxShadow: '0 0 0 26px rgba(255,255,255,0.025)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse at 30% 20%, black, transparent 75%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon
          className="size-[3.2rem] opacity-40 transition-transform duration-500 group-hover:scale-105"
          strokeWidth={1.1}
          style={{ color: art.accent }}
        />
      </div>
      <div className="absolute inset-x-4 bottom-3.5 flex items-center justify-between">
        <span className="text-[0.52rem] font-bold tracking-[0.2em] text-white/45">
          {art.label}
        </span>
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: art.accent }}
        />
      </div>
    </div>
  )
}
