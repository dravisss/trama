# Segurança

## Relatando uma vulnerabilidade

Não publique detalhes exploráveis em uma issue pública. Até existir um endereço privado de
segurança no repositório, contate o mantenedor pelo canal privado associado ao perfil que publicou
o projeto. Inclua versão ou commit, impacto, passos mínimos de reprodução e uma sugestão de
mitigação, se houver.

A Trama é uma aplicação local-first. Arquivos SQLite e exports podem conter conteúdo criado
pelo usuário; trate-os como dados privados e revise-os antes de compartilhar.

## Versões suportadas

Enquanto o projeto estiver em `0.x`, correções de segurança serão aplicadas à versão mais recente
da branch principal. Esta política será revisada quando houver releases públicos estáveis.
