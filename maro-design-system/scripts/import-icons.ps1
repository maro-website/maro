param(
  [string]$SourceRoot = 'C:\Users\nicep\Downloads'
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$iconRoot = Join-Path $workspaceRoot 'icons'
$brandRoot = Join-Path $workspaceRoot 'assets\brand'
$partnerRoot = Join-Path $workspaceRoot 'assets\partners'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Force -Path $iconRoot, $brandRoot, $partnerRoot | Out-Null

$sourceMap = [ordered]@{
  'site-alt (6).svg'           = 'maro-web.svg'
  'bahai.svg'                  = 'maro-brand.svg'
  'folder-open (1).svg'        = 'folder-open.svg'
  'loading (1).svg'            = 'loading.svg'
  'formati or size.svg'        = 'aspect-ratio.svg'
  'maroFort.svg'               = 'maro-fort.svg'
  'notification.svg'           = 'notification.svg'
  'time-past.svg'              = 'history.svg'
  'bulb (1).svg'               = 'idea.svg'
  'lock (1).svg'               = 'lock.svg'
  'sidebar-flip.svg'           = 'sidebar-toggle.svg'
  'maroImazh.svg'              = 'maro-imazh.svg'
  'maro-generate.svg'          = 'generate.svg'
  'message-arrow-up-right.svg' = 'message-external.svg'
  'speed.svg'                  = 'speed.svg'
  'teksti.svg'                 = 'text.svg'
  'dropdown.svg'               = 'dropdown-control.svg'
  'chatgpt.svg'                = 'chatgpt.svg'
  'fullscreen.svg'             = 'fullscreen.svg'
  'attach.svg'                 = 'attach.svg'
  'dil.svg'                    = 'logout.svg'
  'maroKreator.svg'            = 'maro-kreator.svg'
  'save.svg'                   = 'save.svg'
  'cilesimet.svg'              = 'settings.svg'
  'admin.svg'                  = 'admin.svg'
  'user (3).svg'               = 'user.svg'
  'coins (1).svg'              = 'credits.svg'
  'wallet.svg'                 = 'wallet.svg'
  'maroZo.svg'                 = 'maro-zo.svg'
  'maroFilma.svg'              = 'maro-filma.svg'
  'dropdown-select.svg'        = 'select.svg'
  'window-alt.svg'             = 'window.svg'
}

function ConvertTo-MaroIcon {
  param([string]$RawSvg)

  $clean = $RawSvg -replace '(?s)<\?xml.*?\?>', ''
  $clean = $clean -replace '(?s)<!--.*?-->', ''
  $clean = $clean.Trim()
  $clean = [regex]::Replace($clean, '\s+(fill|stroke)="[^"]*"', '')
  $clean = [regex]::Replace(
    $clean,
    '(?is)<svg\b[^>]*>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">',
    1
  )
  $clean = $clean -replace '>\s+<', ">`n  <"
  $clean = $clean -replace '</svg>$', "`n</svg>"
  return $clean + "`n"
}

foreach ($entry in $sourceMap.GetEnumerator()) {
  $sourcePath = Join-Path $SourceRoot $entry.Key
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Missing supplied icon: $sourcePath"
  }

  $normalized = ConvertTo-MaroIcon -RawSvg (Get-Content -Raw -LiteralPath $sourcePath)
  [IO.File]::WriteAllText((Join-Path $iconRoot $entry.Value), $normalized, $utf8NoBom)
}

$generated = [ordered]@{
  'menu.svg' = '<rect x="3" y="5" width="18" height="2" rx="1"/><rect x="3" y="11" width="18" height="2" rx="1"/><rect x="3" y="17" width="18" height="2" rx="1"/>'
  'close.svg' = '<path d="M5.64 4.22 12 10.59l6.36-6.37 1.42 1.42L13.41 12l6.37 6.36-1.42 1.42L12 13.41l-6.36 6.37-1.42-1.42L10.59 12 4.22 5.64z"/>'
  'arrow-left.svg' = '<path d="m10.7 4.3-7 7a1 1 0 0 0 0 1.4l7 7 1.4-1.4L6.8 13H21v-2H6.8l5.3-5.3z"/>'
  'arrow-right.svg' = '<path d="m13.3 4.3 7 7a1 1 0 0 1 0 1.4l-7 7-1.4-1.4 5.3-5.3H3v-2h14.2l-5.3-5.3z"/>'
  'arrow-up.svg' = '<path d="m4.3 10.7 7-7a1 1 0 0 1 1.4 0l7 7-1.4 1.4L13 6.8V21h-2V6.8l-5.3 5.3z"/>'
  'arrow-down.svg' = '<path d="m4.3 13.3 7 7a1 1 0 0 0 1.4 0l7-7-1.4-1.4-5.3 5.3V3h-2v14.2l-5.3-5.3z"/>'
  'chevron-left.svg' = '<path d="M15.4 4 7.4 12l8 8 1.4-1.4-6.6-6.6 6.6-6.6z"/>'
  'chevron-right.svg' = '<path d="m8.6 4 8 8-8 8-1.4-1.4 6.6-6.6-6.6-6.6z"/>'
  'chevron-up.svg' = '<path d="m4 15.4 8-8 8 8-1.4 1.4-6.6-6.6-6.6 6.6z"/>'
  'chevron-down.svg' = '<path d="m4 8.6 8 8 8-8-1.4-1.4-6.6 6.6-6.6-6.6z"/>'
  'more-horizontal.svg' = '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>'
  'search.svg' = '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 4.61 13.42l4.73 4.73 1.41-1.41-4.73-4.73A7.5 7.5 0 0 0 10.5 3Zm-5.5 7.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"/>'
  'plus.svg' = '<path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/>'
  'edit.svg' = '<path d="m16.86 2.28 4.86 4.86-13.5 13.5-6.18 1.32 1.32-6.18 13.5-13.5Zm-11.65 14.5-.57 2.58 2.58-.57L18.9 7.11 16.9 5.1 5.21 16.78Z"/>'
  'trash.svg' = '<path d="M8 3V1h8v2h5v2H3V3h5Zm-3 4h14l-1 16H6L5 7Zm4 3 .5 9h2L11 10H9Zm4 0-.5 9h2l.5-9h-2Z"/>'
  'download.svg' = '<path d="M11 3h2v10.17l3.59-3.58L18 11l-6 6-6-6 1.41-1.41L11 13.17V3ZM4 19h16v2H4v-2Z"/>'
  'upload.svg' = '<path d="M11 17h2V6.83l3.59 3.58L18 9l-6-6-6 6 1.41 1.41L11 6.83V17ZM4 19h16v2H4v-2Z"/>'
  'copy.svg' = '<path d="M7 7V2h15v15h-5v5H2V7h5Zm2 0h8v8h3V4H9v3Zm6 2H4v11h11V9Z"/>'
  'refresh.svg' = '<path d="M12 3a9 9 0 0 1 8.44 5.88l1.62-.94.94 1.63-4.33 2.5-2.5-4.33 1.63-.94.73 1.26A7 7 0 1 0 19 14h2a9 9 0 1 1-9-11Z"/>'
  'undo.svg' = '<path d="M9 5 2 11l7 6v-4h5a6 6 0 0 1 6 6v2h2v-2a8 8 0 0 0-8-8H9V5Z"/>'
  'redo.svg' = '<path d="m15 5 7 6-7 6v-4h-5a6 6 0 0 0-6 6v2H2v-2a8 8 0 0 1 8-8h5V5Z"/>'
  'filter.svg' = '<path d="M2 4h20l-8 9v6l-4 2v-8L2 4Z"/>'
  'sort.svg' = '<path d="M7 3 2 8h4v13h2V8h4L7 3Zm10 18 5-5h-4V3h-2v13h-4l5 5Z"/>'
  'check.svg' = '<path d="m9.2 18.2-5.4-5.4 1.4-1.4 4 4 9.6-9.6 1.4 1.4-11 11Z"/>'
  'check-circle.svg' = '<path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm5.7 7.7-7 7a1 1 0 0 1-1.4 0l-3-3 1.4-1.4 2.3 2.3 6.3-6.3 1.4 1.4Z"/>'
  'error-circle.svg' = '<path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-3.3 6.3L12 10.6l3.3-3.3 1.4 1.4-3.3 3.3 3.3 3.3-1.4 1.4-3.3-3.3-3.3 3.3-1.4-1.4 3.3-3.3-3.3-3.3 1.4-1.4Z"/>'
  'warning.svg' = '<path fill-rule="evenodd" d="m10.27 2.95-9 16A2 2 0 0 0 3 22h18a2 2 0 0 0 1.73-3.05l-9-16a2 2 0 0 0-3.46 0ZM11 8h2v6h-2V8Zm0 8h2v2h-2v-2Z"/>'
  'info.svg' = '<path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-1 9h2v8h-2v-8Zm0-4h2v2h-2V6Z"/>'
  'help.svg' = '<path fill-rule="evenodd" d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm0 5a4 4 0 0 1 2 7.46c-.64.37-1 .68-1 1.54h-2c0-1.72.8-2.58 2-3.27A2 2 0 1 0 10 10H8a4 4 0 0 1 4-4Zm-1 11h2v2h-2v-2Z"/>'
  'eye.svg' = '<path fill-rule="evenodd" d="M12 4C6.5 4 2.1 8.1.5 12c1.6 3.9 6 8 11.5 8s9.9-4.1 11.5-8C21.9 8.1 17.5 4 12 4Zm0 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>'
  'eye-off.svg' = '<path d="m3.7 2.3 18 18-1.4 1.4-3.12-3.12A11.2 11.2 0 0 1 12 20C6.5 20 2.1 15.9.5 12a15.2 15.2 0 0 1 4.06-5.7L2.3 3.7l1.4-1.4ZM7.1 8.84A5 5 0 0 0 14.9 16.6l-1.48-1.48A3 3 0 0 1 8.58 10.3L7.1 8.84ZM12 4c5.5 0 9.9 4.1 11.5 8a15.1 15.1 0 0 1-2.76 4.35l-2.82-2.82A5 5 0 0 0 10.47 6.1L8.64 4.26A11.9 11.9 0 0 1 12 4Z"/>'
  'microphone.svg' = '<path d="M12 2a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Zm-7 9h2v1a5 5 0 0 0 10 0v-1h2v1a7 7 0 0 1-6 6.92V22h4v2H7v-2h4v-3.08A7 7 0 0 1 5 12v-1Z"/>'
  'volume.svg' = '<path d="M3 9h4l5-5v16l-5-5H3V9Zm12.5-.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2l1.4-1.4Zm2.8-2.8a9 9 0 0 1 0 12.6l-1.4-1.4a7 7 0 0 0 0-9.8l1.4-1.4Z"/>'
  'play.svg' = '<path d="M6 3.8v16.4c0 .78.86 1.26 1.53.86l13.1-8.2a1 1 0 0 0 0-1.72l-13.1-8.2A1 1 0 0 0 6 3.8Z"/>'
  'pause.svg' = '<rect x="5" y="3" width="5" height="18" rx="1"/><rect x="14" y="3" width="5" height="18" rx="1"/>'
  'stop.svg' = '<rect x="4" y="4" width="16" height="16" rx="2"/>'
  'video.svg' = '<path d="M3 5h12a3 3 0 0 1 3 3v1.5l4-2.5v10l-4-2.5V16a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"/>'
  'image.svg' = '<path fill-rule="evenodd" d="M3 3h18a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm3.5 7A2.5 2.5 0 1 0 6.5 5a2.5 2.5 0 0 0 0 5ZM2 18l5-5 3.5 3.5 3-3L21 19H3a1 1 0 0 1-1-1Z"/>'
  'crop.svg' = '<path d="M6 2v4h12v12h4v2h-4v4h-2v-4H4V8H0V6h4V2h2Zm0 6v10h10V8H6Z"/>'
  'rotate-left.svg' = '<path d="M8 4.6V1L2 7l6 6V9a7 7 0 1 1-1.64 4.5l-1.9.62A9 9 0 1 0 8 4.6Z"/>'
  'zoom-in.svg' = '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 4.61 13.42l4.73 4.73 1.41-1.41-4.73-4.73A7.5 7.5 0 0 0 10.5 3ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0ZM9.5 7h2v2.5H14v2h-2.5V14h-2v-2.5H7v-2h2.5V7Z"/>'
  'zoom-out.svg' = '<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 4.61 13.42l4.73 4.73 1.41-1.41-4.73-4.73A7.5 7.5 0 0 0 10.5 3ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0ZM7 9.5h7v2H7v-2Z"/>'
  'mail.svg' = '<path d="M3 4h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm9 8.2L3 6.5V8l9 5.7L21 8V6.5l-9 5.7Z"/>'
  'key.svg' = '<path fill-rule="evenodd" d="M14 3a7 7 0 0 0-6.71 9H0v5h3v3h4v-3h3v-2.1A7 7 0 1 0 14 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm3 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>'
  'calendar.svg' = '<path fill-rule="evenodd" d="M5 1h2v3h10V1h2v3h1a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h1V1ZM2 10v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10H2Zm3 3h3v3H5v-3Zm5 0h3v3h-3v-3Zm5 0h3v3h-3v-3Z"/>'
  'external-link.svg' = '<path d="M13 3h8v8h-2V6.41l-9.3 9.3-1.4-1.42L17.58 5H13V3ZM3 5h7v2H5v12h12v-5h2v7H3V5Z"/>'
}

foreach ($entry in $generated.GetEnumerator()) {
  $svg = "<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"0 0 24 24`" fill=`"currentColor`" aria-hidden=`"true`">`n  $($entry.Value)`n</svg>`n"
  [IO.File]::WriteAllText((Join-Path $iconRoot $entry.Key), $svg, $utf8NoBom)
}

$whiteLogoSource = Join-Path $SourceRoot 'logowhite.svg'
if (Test-Path -LiteralPath $whiteLogoSource) {
  Copy-Item -LiteralPath $whiteLogoSource -Destination (Join-Path $partnerRoot 'nice-logo-white.svg') -Force
}

$categoryMap = @{}
@('maro-web','maro-brand','maro-fort','maro-imazh','maro-kreator','maro-zo','maro-filma','chatgpt') | ForEach-Object { $categoryMap[$_] = 'product' }
@('menu','close','arrow-left','arrow-right','arrow-up','arrow-down','chevron-left','chevron-right','chevron-up','chevron-down','more-horizontal','search','sidebar-toggle','dropdown-control','select','external-link','message-external','window','fullscreen') | ForEach-Object { $categoryMap[$_] = 'navigation' }
@('plus','edit','trash','download','upload','copy','refresh','undo','redo','filter','sort','save','attach','generate','aspect-ratio','speed','text','crop','rotate-left','zoom-in','zoom-out','folder-open','idea') | ForEach-Object { $categoryMap[$_] = 'action' }
@('check','check-circle','error-circle','warning','info','help','notification','loading','history') | ForEach-Object { $categoryMap[$_] = 'feedback' }
@('eye','eye-off') | ForEach-Object { $categoryMap[$_] = 'visibility' }
@('microphone','volume','play','pause','stop','video','image') | ForEach-Object { $categoryMap[$_] = 'media' }
@('user','admin','lock','key','mail','logout','credits','wallet','settings','calendar') | ForEach-Object { $categoryMap[$_] = 'account' }

$aliasMap = @{
  'aspect-ratio' = @('format','size','ratio','formati','madhesia')
  'attach' = @('paperclip','bashkengjit')
  'credits' = @('coins','kredite')
  'edit' = @('pencil','ndrysho')
  'folder-open' = @('saved','projects','cka-ke-maru')
  'generate' = @('submit','send','krijo')
  'history' = @('recent','time','histori')
  'idea' = @('bulb','ide')
  'logout' = @('exit','sign-out','dil')
  'maro-brand' = @('bahai','brand')
  'maro-web' = @('site','website','web')
  'notification' = @('bell','njoftim')
  'refresh' = @('regenerate','retry','provo-perseri')
  'save' = @('bookmark','ruaj')
  'settings' = @('controls','cilesimet')
  'text' = @('type','teksti')
  'trash' = @('delete','remove','fshi')
  'user' = @('account','profile','llogaria')
  'wallet' = @('billing','pagesa')
}

$suppliedNames = @($sourceMap.Values | ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_) })
$iconEntries = Get-ChildItem -LiteralPath $iconRoot -Filter '*.svg' -File | Sort-Object Name | ForEach-Object {
  $name = $_.BaseName
  $aliases = @()
  if ($aliasMap.ContainsKey($name)) { $aliases = @($aliasMap[$name]) }
  [ordered]@{
    name = $name
    file = $_.Name
    category = if ($categoryMap.ContainsKey($name)) { $categoryMap[$name] } else { 'utility' }
    source = if ($suppliedNames -contains $name) { 'supplied' } else { 'system' }
    aliases = $aliases
  }
}

$manifest = [ordered]@{
  name = 'maro-icons'
  version = '1.0.0'
  style = 'solid'
  grid = 24
  color = 'currentColor'
  count = $iconEntries.Count
  icons = @($iconEntries)
}

$manifestJson = $manifest | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $iconRoot 'manifest.json'), $manifestJson + "`n", $utf8NoBom)
[IO.File]::WriteAllText((Join-Path $iconRoot 'icons-data.js'), 'window.MARO_ICONS = ' + ($iconEntries | ConvertTo-Json -Depth 5 -Compress) + ";`n", $utf8NoBom)

"Imported $($sourceMap.Count) supplied icons and created $($generated.Count) system icons. Manifest contains $($iconEntries.Count) icons."
