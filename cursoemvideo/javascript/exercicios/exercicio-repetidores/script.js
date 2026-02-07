function contador(){
    var inicioEl  = document.querySelector('#iiniciar')
    var fimEl     = document.querySelector('#ifinal')
    var passoEl   = document.querySelector('#ipasso')
    var res       = document.querySelector('#res')

    if(!inicioEl.value || !fimEl.value){
        window.alert('Você deve preencher os campos.')
        res.textContent = 'Preparando a contagem...'
        return
    }
    
    var inicio      = Number(inicioEl.value)
    var fim         = Number(fimEl.value)
    
    var passoNum    = Number(passoEl.value)

    if(!passoEl.value){
        window.alert('Você não informou o passo. Será assumido passo igual a 1')
        passoNum = 1
    }

    if(passoNum <= 0){
        window.alert('Passo inválido. Será assumido passo igual a 1')
        passoNum = 1
    }

    var saida = 'Contando: <br>'
    res.innerHTML = saida

    if(inicio <= fim){
        for(var c = inicio; c <= fim ; c += passoNum ){
        saida += `${c} \u{1F449} `
    }
    }else{
        for(var c = inicio; c >= fim ; c -= passoNum ){
        saida += `${c} \u{1F449} `
    }
    }
    saida += `\u{1F3C1}`

    res.innerHTML = saida.trim()

}

function resetar() {
  const inicioEl = document.querySelector('#iiniciar');
  const fimEl    = document.querySelector('#ifinal');
  const passoEl  = document.querySelector('#ipasso');
  const res      = document.querySelector('#res');

  inicioEl.value = '';
  fimEl.value = '';
  passoEl.value = '';

  res.textContent = 'Preparando a contagem...';
  inicioEl.focus();
}