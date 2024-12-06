import Layout from "./components/Layout/Layout";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col gap-8 p-8 pb-20 sm:p-20">
        <Layout />
      </main>
      <footer className="mt-auto py-4 text-center">
        <span>Trabalho 2 - Arquitetura de Computadores III - PUC-MG</span>
      </footer>
    </div>
  );
}
