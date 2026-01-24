import ReactDOM from 'react-dom/client';
import App from './App';
import { V86Provider } from './contexts/V86Provider';
import { DBProvider } from './contexts/DBProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <DBProvider>
    <V86Provider>
      <App />
    </V86Provider>
  </DBProvider>
);
