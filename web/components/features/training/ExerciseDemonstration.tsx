"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { isExerciseMediaUrl, safeCreditUrl, safePersonalVideoUrl } from "@/lib/exercise-media-policy"
import type { DemonstrationPresentation } from "@/types/exercise-demonstration"

type Asset = NonNullable<DemonstrationPresentation["assets"]>[number]
const linkClass = "inline-flex min-h-11 items-center text-[var(--sm-brand)] underline underline-offset-4 break-words"
function CreditLink({ url, children }: { url: string; children: React.ReactNode }) {
  const href = safeCreditUrl(url)
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={linkClass}>{children}</a> : <span>{children}</span>
}

function AssetPresentation({ asset, onUnavailable }: { asset: Asset; onUnavailable?: () => void }) {
  const [failed, setFailed] = useState(false)
  const [videoRequested, setVideoRequested] = useState(false)
  const allowed = asset.displayAllowed === true && isExerciseMediaUrl(asset.url)
  const unavailable = () => { setFailed(true); onUnavailable?.() }
  return <figure className="min-w-0 space-y-2">
    {!allowed || failed ? <p role="status" className="text-sm text-[var(--sm-muted)]">Demonstração indisponível</p> : asset.type === "IMAGE" ? <>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--sm-muted)]">Ilustração</p>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[var(--sm-radius-md)] bg-slate-800 p-4">
        {/* External SVG remains an image; no optimizer, inline SVG, or provider HTML. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt={asset.alt} width={640} height={480} loading="lazy" referrerPolicy="no-referrer" onError={unavailable} className="h-full w-full object-contain" />
      </div>
    </> : videoRequested ? <video src={asset.url} controls preload="none" onError={unavailable} aria-label={asset.alt} className="aspect-video w-full rounded-[var(--sm-radius-md)] bg-slate-800">Seu navegador não suporta este vídeo.</video> : <Button type="button" variant="outline" className="min-h-11" onClick={() => setVideoRequested(true)}>Carregar vídeo</Button>}
    <figcaption className="space-y-1 break-words text-sm text-[var(--sm-muted)]">
      <p>{asset.alt}</p>
      <p>Autoria: {asset.author}</p>
      <div className="flex flex-wrap gap-x-4"><CreditLink url={asset.licenseUrl}>{asset.licenseName}</CreditLink><CreditLink url={asset.sourcePageUrl}>Fonte</CreditLink>{asset.upstreamSourcePageUrl ? <CreditLink url={asset.upstreamSourcePageUrl}>Fonte original</CreditLink> : null}</div>
      {asset.changes ? <p>Alterações: {asset.changes}</p> : null}
    </figcaption>
  </figure>
}

export function ExerciseDemonstration({ snapshot, onUnavailable }: { snapshot: DemonstrationPresentation | null | undefined; onUnavailable?: () => void }) {
  const ownVideo = safePersonalVideoUrl(snapshot?.personalVideoUrl)
  return <div className="space-y-4">
    {snapshot?.instruction ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{snapshot.instruction}</p> : null}
    <div className="space-y-4 print:hidden">
      {!snapshot?.assets?.length && !ownVideo ? <p role="status" className="text-sm text-[var(--sm-muted)]">Demonstração indisponível</p> : null}
      {snapshot?.assets?.map(asset => <AssetPresentation key={`${snapshot.revision}:${asset.id}:${asset.url}`} asset={asset} onUnavailable={onUnavailable} />)}
      {ownVideo ? <div><p className="text-sm text-[var(--sm-muted)]">Vídeo informado pelo profissional</p><a href={ownVideo} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={linkClass}>Abrir vídeo</a><p className="text-xs text-[var(--sm-muted)]">Se o vídeo não estiver disponível, continue usando as orientações da ficha.</p></div> : null}
    </div>
  </div>
}
