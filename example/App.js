import {Document,render} from '@barelyhuman/preact-native/dom';


const document = new Document();

function App(){
  const safeAreaView = document.createElement('SafeAreaView');
  const text = document.createElement('Text');
  text.textContent = 'hello';
  safeAreaView.appendChild(text);
  document.appendChild(safeAreaView);

  setTimeout(()=>{
    text.textContent = 'world';
  },2000);

  return render(document);
}

export default App;

