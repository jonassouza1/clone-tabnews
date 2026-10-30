import DefaultLayout from "interface/DefaultLayout";

function Home() {
  return (
    <DefaultLayout
      metadata={{
        description: "É isso ai pessoal!",
      }}
    >
      <h1>
        Espero que você se sinta realizado com tudo que conquistou e que tenha
        um ponto de referência, como um commit atemporal{" "}
      </h1>
    </DefaultLayout>
  );
}

export default Home;
