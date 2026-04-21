import Menu from "../../componentes/Menu/Menu";
import Mural from "../../componentes/Mural/Mural";
import "./Home.css";

function Home() {

  return (
    <>
      <Menu />
      <div className="home-scroll-wrap">
        <Mural />
      </div>
    </>
  );
}

export default Home;
