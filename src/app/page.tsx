import Layout from "./components/Layout/Layout";

export default function Home() {
  return (
    <div className=" items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <Layout />
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <span>Trabalho 2 - Arquitetura de Computadores III - PUC-MG</span>
      </footer>
    </div>
  );
}
