/** MSB signet for Payload's small header icon (`admin.components.graphics.Icon`). */
export function AdminIcon() {
  // biome-ignore lint/performance/noImgElement: tiny static SVG in the admin
  return <img src="/logo/signet-green.svg" alt="MakerSpace Bonn" width={22} height={25} />
}

/** MSB logo on the login screen (`admin.components.graphics.Logo`). */
export function AdminLogo() {
  return (
    <div className="msb-admin-logo">
      {/* biome-ignore lint/performance/noImgElement: static logo in the admin */}
      <img src="/logo/signet-green.svg" alt="" width={48} height={54} />
      <span>
        <strong>MakerSpace Bonn</strong>
        <small>Redaktion</small>
      </span>
    </div>
  )
}
