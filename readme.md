# 🛡️ ZYRA - MMORPG Engine

Zyra é uma engine de MMORPG moderna de alto desempenho, construída com uma arquitetura de Monorepo e comunicação em tempo real via WebSockets.

## 🚀 Tecnologias Core

* **Frontend:** [PixiJS](https://pixijs.com/) (Renderização via WebGL/WebGPU).
* **Backend:** [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/).
* **Networking:** [Colyseus](https://colyseus.io/) (Sincronização de Estado baseada em Rooms).
* **Database:** [PostgreSQL](https://www.postgresql.org/) (Persistência robusta).
* **Gerenciador de Pacotes:** [PNPM](https://pnpm.io/) (Workspaces para performance).

## 📂 Estrutura do Monorepo

* `packages/client/`: Lógica do jogo, sistema de câmeras e visualizadores.
* `packages/server/`: Lógica de autoridade do servidor, salas de combate e API administrativa.
* `packages/shared/`: Definições de Schemas, Registros de Itens e Monstros compartilhados.
* `public/`: Painel Administrativo (`admin.html`) para gestão técnica do mundo.

## 🛠️ Funcionalidades Implementadas

### ⚔️ Combate & Progressão
* **Sistema de Ataque:** Suporte para ataques corpo-a-corpo e projéteis (Ranged).
* **Progressão de Nível:** Cálculo dinâmico de XP e sistema de Level Up com ganho de atributos.
* **Economia:** Sistema de Gold dropado por monstros e persistência de riqueza.
* **Loot & Drops:** Tabelas de drop configuráveis por monstro via Admin.

### 🎒 Inventário & Equipamentos
* **Inventory Management:** Sistema de slots com suporte a movimentação de itens.
* **Equipment System:** Slots dedicados para chapéus e armas que alteram o visual do player.
* **Persistence:** Sincronização automática de itens equipados com o banco de dados PostgreSQL.

### 🎨 Visual & Admin
* **Ajuste Fino de Assets:** Painel para configuração de offsets, escala e rotação de sprites sem mexer no código.
* **Sync de Movimento:** Implementação de Interpolação Linear (Lerp) para fluidez visual.
* **Timeline de Camadas:** Gestão de sobreposição de Corpos, Faces e Acessórios.

## 🔧 Como Iniciar o Desenvolvimento

Este projeto utiliza PNPM Workspaces para facilitar o gerenciamento.

1.  **Instalar dependências:**
    ```bash
    pnpm install
    ```
2.  **Configurar Ambiente:**
    * Configure as credenciais do PostgreSQL no arquivo `.env` dentro de `packages/server`.
3.  **Iniciar Projeto (Full-stack):**
    Na raiz do projeto, execute:
    ```bash
    pnpm run dev
    ```
    *Este comando iniciará simultaneamente o Cliente (Porta 3000) e o Servidor (Porta 2567).*

## 📜 Licença
Projeto em desenvolvimento ativo por [Edward/Zyra Team].