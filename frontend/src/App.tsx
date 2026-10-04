import { Calculator } from './components/Calculator';

export default function App() {
  return (
    <main className="container py-4">
      <div className="col-md-8 col-lg-5 mx-auto">
        <h1 className="h3 text-center mb-4">Calculator</h1>
        <Calculator />
      </div>
    </main>
  );
}
