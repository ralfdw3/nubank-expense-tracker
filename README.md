# Organizador de Despesas de Cartão de Crédito

Script automático para organizar e categorizar suas despesas de cartão de crédito e conta corrente.

## O que este script faz?

- 📊 Lê seus extratos bancários (Nubank) em formato CSV
- 🏷️ Categoriza automaticamente suas despesas (alimentação, transporte, educação, etc.)
- 💰 Separa gastos de receitas
- 📈 Gera um relatório completo em csv
- 📝 Resume seus gastos por categoria

---

## Passo 1: Instalar o Node.js

O Node.js é necessário para rodar o script.

### Windows:

1. Acesse: https://nodejs.org/
2. Clique no botão verde "Download Node.js (LTS)"
3. Execute o arquivo baixado
4. Clique em "Next" em todas as telas (deixe as opções padrão)
5. Clique em "Install" e aguarde
6. Clique em "Finish"

### Mac:

1. Acesse: https://nodejs.org/
2. Clique no botão verde "Download Node.js (LTS)"
3. Abra o arquivo .pkg baixado
4. Siga as instruções na tela
5. Digite sua senha quando solicitado

### Linux (Ubuntu/Debian):

Abra o Terminal e execute:

```bash
sudo apt update
sudo apt install nodejs npm
```

### Como verificar se instalou corretamente:

1. Abra o Terminal (Mac/Linux) ou Prompt de Comando (Windows)
2. Digite: `node --version`
3. Deve aparecer algo como: `v24.10.0`

---

## Passo 2: Baixar o Script

### Opção A: Baixar os arquivos diretamente (MAIS FÁCIL)

1. Crie uma pasta no seu computador chamada "Organizador de Contas"
2. Baixe os seguintes arquivos para esta pasta:
   - `script.js`
   - `categories.json`
   - `package.json`
3. Pronto! Vá para o Passo 3

### Opção B: Usar o Git (para quem quer aprender)

#### Instalar o Git primeiro:

**Windows:**

1. Acesse: https://git-scm.com/download/win
2. Baixe e instale (pode clicar "Next" em tudo)

**Mac:**

1. Abra o Terminal
2. Digite: `git --version`
3. Se pedir para instalar, clique "Instalar"

**Linux:**

```bash
sudo apt install git
```

#### Baixar o projeto:

1. Abra o Terminal (Mac/Linux) ou Git Bash (Windows)
2. Navegue até onde quer salvar os arquivos:
   ```bash
   cd Desktop
   ```
3. Clone o repositório (substitua pela URL correta):
   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd [NOME_DA_PASTA]
   ```

---

## Passo 3: Instalar as Dependências

1. Abra o Terminal (Mac/Linux) ou Prompt de Comando (Windows)
2. Navegue até a pasta do script:

   ```bash
   cd caminho/para/a/pasta
   ```

   **Exemplo no Windows:**

   ```bash
   cd C:\Users\SeuNome\Desktop\Organizador de Contas
   ```

   **Exemplo no Mac:**

   ```bash
   cd ~/Desktop/Organizador\ de\ Contas
   ```

3. Execute o comando:

   ```bash
   npm install
   ```

4. Aguarde até aparecer a mensagem de conclusão

---

## Passo 4: Preparar seus Arquivos CSV

### 4.1 Exportar seus extratos do banco (conta corrente + cartão de crédito)

**Nubank (exemplo):**

1. Abra o app do Nubank
2. Vá em "Cartão de Crédito" > "Ver extrato"
3. Clique nos 3 pontinhos no canto superior
4. Escolha "Exportar extrato"
5. Selecione o período desejado
6. Escolha formato CSV
7. Salve o arquivo

### 4.2 Renomear os arquivos

Você precisa ter 2 arquivos CSV:

- **credit.csv** - Extrato do cartão de crédito
- **debit.csv** - Extrato da conta corrente

Renomeie seus arquivos exportados para esses nomes exatos.

### 4.3 Colocar os arquivos na pasta correta

Coloque os arquivos `credit.csv` e `debit.csv` na mesma pasta onde está o `script.js`

**Estrutura final da pasta:**

```
Organizador de Contas/
├── script.js
├── categories.json
├── package.json
├── credit.csv          ← Seu arquivo
├── debit.csv           ← Seu arquivo
└── node_modules/       ← Criado automaticamente
```

---

## Passo 5: Rodar o Script

1. Abra o Terminal/Prompt de Comando
2. Navegue até a pasta do script (se ainda não estiver lá)
3. Execute:

   ```bash
   node script.js
   ```

4. O script vai processar seus arquivos e mostrar um resumo no terminal

5. Será criado um arquivo chamado **categorized_expenses.csv** na mesma pasta

---

## Passo 6: Ver o Resultado

1. Abra o arquivo `categorized_expenses.csv`
2. Você pode abrir com:
   - Microsoft Excel
   - Google Sheets (importar arquivo)
   - LibreOffice Calc
   - Numbers (Mac)

---

## Personalizando as Categorias

O arquivo `categories.json` define como o script categoriza suas despesas.

### Como adicionar novas palavras-chave:

1. Abra o arquivo `categories.json` em qualquer editor de texto
2. Encontre a categoria desejada
3. Adicione novas palavras-chave

**Exemplo:**

```json
{
  "Food & Dining": [
    "restaurant",
    "cafe",
    "ifood",
    "rappi",           ← Adicione aqui
    "nome do mercado"  ← Ou aqui
  ]
}
```

---

## Recursos Especiais

### 🚗 Agrupamento de Pedágios NuTag

Todas as cobranças do NuTag são automaticamente somadas e aparecem como uma única entrada "Pedágios NuTag".

### 💳 Evita Contagem Duplicada

O script automaticamente remove linhas de "Pagamento de fatura" do extrato de débito para evitar que os gastos do cartão sejam contados duas vezes.

### 💰 Correção Automática de Sinais

- **credit.csv**: Todos os valores são convertidos para negativos (gastos)
- **debit.csv**: Mantém os sinais originais (negativo = gasto, positivo = receita)

---

## Problemas Comuns

### "Command not found" ou "node não é reconhecido"

**Solução:** Node.js não está instalado ou não está no PATH. Reinstale o Node.js.

### "Cannot find module 'csv-parse/sync'"

**Solução:** Execute `npm install` novamente na pasta do script.

### "Warning: File not found - credit.csv"

**Solução:** Certifique-se de que os arquivos CSV estão na mesma pasta do script e com os nomes corretos.

---

## Rodando Novamente

Sempre que você tiver novos extratos:

1. Exporte os novos extratos do banco
2. Substitua os arquivos `credit.csv` e `debit.csv`
3. Execute novamente: `node script.js`
4. Um novo arquivo `categorized_expenses.csv` será criado (substituindo o anterior)

**Dica:** Faça backup dos relatórios antigos renomeando-os antes de rodar o script novamente:

```bash
mv categorized_expenses.csv backup_janeiro_2026.csv
```

---

## Contato e Suporte

Se tiver dúvidas ou problemas:

1. Verifique se seguiu todos os passos corretamente
2. Leia a seção "Problemas Comuns"
3. Entre em contato com quem te passou este script

---

## Segurança e Privacidade

⚠️ **IMPORTANTE:**

- Seus dados bancários ficam apenas no seu computador
- O script não envia nenhuma informação para a internet
- Não compartilhe seus arquivos CSV com outras pessoas
- Faça backup dos seus arquivos antes de modificá-los

---

## Dicas Extras

### Para usuários de Windows:

- Use o PowerShell em vez do Prompt de Comando (mais moderno)
- Para abrir rapidamente: clique com botão direito na pasta e escolha "Abrir no Terminal"

### Para usuários de Mac:

- Para abrir o Terminal rapidamente: pressione Cmd + Espaço, digite "Terminal"
- Você pode arrastar a pasta para o Terminal após digitar `cd ` (com espaço) para navegar automaticamente

---

## Atualizações Futuras

Se você receber uma versão atualizada do script:

1. Faça backup do seu `categories.json` personalizado
2. Substitua o `script.js` pelo novo
3. Restaure seu `categories.json` (se quiser manter suas personalizações)

---

**Versão:** 1.0
**Última atualização:** Janeiro 2026
**Compatibilidade:** Windows, Mac, Linux
