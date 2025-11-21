# Termo-Extremo
# Jogo de Palavras Diário (Solo, Dueto, Trio, Quarteto)

Este é um jogo estilo Termo/Wordle em português, com quatro modos:
- Solo: 1 palavra
- Dueto: 2 palavras
- Trio: 3 palavras
- Quarteto: 4 palavras

Um único palpite (5 letras) é aplicado a todos os tabuleiros ativos. As palavras mudam automaticamente a cada 24 horas (baseado na data local do usuário).

## Como jogar
1. Escolha o modo (Solo, Dueto, Trio, Quarteto).
2. Digite uma palavra de 5 letras no campo e clique em Enviar.
3. As cores significam:
   - Verde: letra correta na posição certa.
   - Laranja: letra existe, mas em outra posição.
   - Cinza: letra não existe na palavra.
4. Você tem 6 tentativas por tabuleiro.

## Rodando localmente
- Abra `index.html` no navegador.

## Publicando no GitHub Pages
1. Crie um repositório e envie todos os arquivos.
2. Em Settings → Pages, selecione a branch `main` e salve.
3. A URL será `https://seuusuario.github.io/termo-jogo/`.

## Observações
- A lista de palavras (WORD_LIST) está no `script.js`. Para uso real, substitua por uma lista maior de palavras válidas de 5 letras.
- As palavras diárias são geradas de forma determinística com base na data, garantindo novidade a cada dia para todos.
