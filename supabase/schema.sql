-- Rode uma vez no SQL Editor do Supabase.
-- Cria a tabela das fichas e o bucket PRIVADO dos PDFs.

create table if not exists public.fichas (
  id               uuid primary key,
  documento_id     text        not null,
  documento_titulo text        not null,
  nome_cliente     text        not null,
  nome_busca       text        not null, -- nome sem acento e em minúsculas, para a busca
  criado_em        timestamptz not null default now(),
  respostas        jsonb       not null,
  assinatura       jsonb       not null,
  ip               text,
  navegador        text,
  hash             text        not null,
  pdf_caminho      text        not null,
  exemplo          boolean     not null default false
);

create index if not exists fichas_criado_em_idx on public.fichas (criado_em desc);
create index if not exists fichas_nome_busca_idx on public.fichas (nome_busca);

-- Dados de saúde são sensíveis (LGPD): RLS ligado e NENHUMA policy.
-- Assim a chave pública (anon) não lê nada; só o servidor, com a service_role, acessa.
alter table public.fichas enable row level security;

-- Bucket privado: os PDFs só saem pelo painel, depois do login.
insert into storage.buckets (id, name, public)
values ('fichas-pdf', 'fichas-pdf', false)
on conflict (id) do nothing;
