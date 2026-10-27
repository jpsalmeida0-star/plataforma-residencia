# Biblioteca: conectar o Drive das apostilas

A aba **Apostilas** lê os PDFs de uma pasta do Google Drive, guarda o texto de cada página num índice
**só no seu aparelho** e mostra em que apostila e página está o assunto buscado. Os PDFs continuam no Drive:
o app só pede permissão de leitura e não envia nada para nenhum servidor.

## 1. Criar a chave do Google (uma vez só, uns 10 minutos)

Pode usar qualquer conta Google para criar a chave; a conta das apostilas entra no passo 1.4.

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto chamado `plataforma-residencia`.
2. Em **APIs e serviços > Biblioteca**, procure **Google Drive API** e clique em **Ativar**.
3. Em **Google Auth Platform** (ou **Tela de permissão OAuth**), clique em **Começar**:
   - Nome do app: `Plataforma Residência`; e-mail de suporte: o seu.
   - Público: **Externo**.
   - Deixe o app em modo **Teste** (não precisa publicar).
4. Em **Público > Usuários de teste**, adicione o e-mail da **conta que tem as apostilas**.
5. Em **Clientes**, clique em **Criar cliente**:
   - Tipo: **Aplicativo da Web**.
   - **Origens JavaScript autorizadas**: `http://localhost:3000` e, depois de publicar, o endereço do app
     (ex.: `https://plataforma-residencia.vercel.app`).
   - Não precisa de URI de redirecionamento.
6. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).

## 2. Colocar a chave no app

- No computador: crie o arquivo `.env.local` com `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<o ID copiado>`.
- Na Vercel: **Settings > Environment Variables**, mesma variável, e publique de novo.

O ID do cliente não é segredo (ele aparece no navegador de qualquer forma); não existe "senha do cliente" neste fluxo.

## 3. Usar

1. Na aba **Apostilas**, toque em **Conectar ao Drive** e entre com a conta das apostilas.
   Como o app está em modo Teste, o Google mostra "O Google não verificou este app": toque em
   **Avançado > Acessar Plataforma Residência**. Isso é esperado para um app pessoal.
2. Cole o link da pasta das apostilas (botão direito na pasta > Compartilhar > Copiar link) e toque em
   **Atualizar lista**. Subpastas e atalhos são percorridos.
3. Toque em **Indexar**. Cada PDF é baixado uma vez e lido no próprio navegador; prefira o computador e o Wi-Fi.
   Dá para pausar e continuar depois; o que já foi indexado fica salvo.
4. Busque um assunto. Cada resultado mostra a apostila, o caminho das pastas, a página e um trecho;
   tocar abre o PDF naquela página.

A conexão vale por cerca de 1 hora; depois o app pede para conectar de novo.

## Limitações atuais

- O índice fica no aparelho onde foi feito. Para buscar no celular, indexe também no celular (ou espere a
  sincronização entre aparelhos).
- PDFs escaneados (só imagem) aparecem como "sem texto" e não entram na busca. Ler esses arquivos exige OCR,
  que pode entrar depois.
- A busca é por palavras (sem acento e aceitando a última palavra incompleta), não por significado.
