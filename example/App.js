import {Text,SafeAreaView,View,TouchableOpacity} from 'react-native';
import {Document,render,registerHostElement} from '@barelyhuman/preact-native/dom';



const document = new Document();

registerHostElement('input',Text);
registerHostElement('p',Text);
registerHostElement('safeareaview',SafeAreaView);
registerHostElement('div',View);
registerHostElement('button',TouchableOpacity);

function App(){
  let count = 0;

  const touchable = document.createElement('button');
  touchable.setAttribute('activeOpacity',1);

  const text = document.createElement('p');
  text.textContent = count;
  touchable.appendChild(text);

  Object.assign(touchable.style,{
    height: '100%',
    width: '100%',
    alignItems:'center',
    justifyContent:'center',
    backgroundColor:'#181A1F',
    borderRadius: 6,
  });

  Object.assign(text.style,{
    fontSize:52,
    color:'#C6CCD7',
    fontWeight:'bold',
  });


  touchable.addEventListener('press',(e)=>{
    text.textContent = ++count;
    Object.assign(text.style,{
      color:count % 2 === 0 ? '#98C379' : '#E06C75',
    });
  });
  return render(touchable);
}

export default App;

