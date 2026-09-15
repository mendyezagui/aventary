-- Let a generated document be structure rather than markup.
--
-- WHY. client_page_documents has only ever held `html` — a whole standalone
-- document, produced in one piece and stored finished. That made the rendering
-- of a generated page entirely the generator's problem, which is how two live
-- client documents came to be hand-built HTML with their own class names,
-- their own type scale and their own idea of what a section looks like. The
-- design system in lib/client-doc could not reach them, because by the time a
-- row exists there is nothing left to lay out.
--
-- A row may now carry `blocks` instead: the same {tab, title, body, format,
-- sort} shape Client Hub uses and project-page-feed returns, with components
-- chosen by directive at the top of each body. The website builds the document
-- from them on request, so a generated page picks up the template, the
-- collapsing, the contents rail, the per-client branding and every future
-- change to any of it — none of which a finished HTML blob can ever gain.
--
-- `meta` is the same object as projects.public_meta: heading, subheading,
-- prepared_for, prepared_by, brand, layout.
--
-- BOTH COLUMNS ARE NULLABLE AND NOTHING IS BACKFILLED. The existing rows keep
-- serving their html exactly as before; `blocks` simply wins when present. That
-- matters more than it sounds: micah and myef are live documents in front of
-- named readers, and a migration is the wrong place to decide that the version
-- they have been sent should be replaced.

alter table public.client_page_documents
  add column if not exists blocks jsonb,
  add column if not exists meta   jsonb;

comment on column public.client_page_documents.blocks is
  'Ordered document blocks: [{tab, title, body, format, sort}]. Bodies are
   markdown and may open with @component: directives — see
   docs/client-document-template.md. When present this is rendered through the
   shared template and `html` is ignored. Null means this row is finished HTML.';

comment on column public.client_page_documents.meta is
  'Page-level settings, identical in shape to projects.public_meta: heading,
   subheading, prepared_for, prepared_by, brand {name, accent, logo}, layout.
   Only read when `blocks` is present.';

-- A partial index, because the interesting question is "which generated
-- documents are structured" and the answer will be a shrinking minority for a
-- while and then, one hopes, all of them.
create index if not exists client_page_documents_structured_idx
  on public.client_page_documents (slug)
  where blocks is not null;

-- A structured document has no html, so html stops being required.
--
-- Everything above says a row may carry `blocks` instead of finished markup. It
-- could not: html was NOT NULL, so every structured row would have had to carry
-- an empty string to satisfy a constraint describing a shape it does not have.
-- A column that is only sometimes applicable should not be mandatory.
--
-- Nothing is relaxed about what gets SERVED. lib/client-pages returns no
-- document when a row has neither blocks nor html, so an empty row reads as
-- "not found" rather than as a blank page — the same failure direction as before.

alter table public.client_page_documents
  alter column html drop not null;

comment on column public.client_page_documents.html is
  'Finished standalone markup, served as-is in an iframe. Null for a structured
   row, which carries `blocks` instead and is rendered through the shared
   template. A row with neither is not served at all.';
