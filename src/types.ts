/**
 * Minimal subset of @rynfar/meridian's plugin-authoring types, inlined so
 * this plugin can be built and installed without meridian being present.
 *
 * The Transform interface is structural — as long as the shape matches,
 * meridian's pipeline runner accepts this plugin whether or not meridian's
 * own types are available at consumer build time. Once @rynfar/meridian
 * exports the types (1.38.0+) you may prefer to import directly from
 * there, but it's not required.
 */

/** A request-time context object. Only the fields this plugin reads or
 *  writes are typed here; meridian populates many more. Unknown extras
 *  are preserved via the index signature. */
export interface RequestContext {
  /** Agent adapter name (readonly from meridian's perspective) */
  readonly adapter: string
  /** Model the request targets, as resolved by meridian */
  model?: string
  /** Client-provided system prompt / context string, if any */
  systemContext?: string
  /** Plugin-to-plugin state bag */
  metadata: Record<string, unknown>
  /** Everything else meridian fills in — messages, model, tools, ... */
  [key: string]: unknown
}

/** Plugin contract. meridian's loader accepts any default export matching
 *  this shape. */
export interface Transform {
  name: string
  description?: string
  version?: string
  adapters?: string[]
  onRequest?(ctx: RequestContext): RequestContext
}
