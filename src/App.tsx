import { createEditor } from "./editor";
import { useRete } from "rete-react-render-plugin";
import styled from "styled-components";

const Info = styled.div`
  margin: 1em;
  text-align: center;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  color: #9f7b00;
`;

export default function App() {
  const [ref] = useRete(createEditor);

  return (
    <div className="App">
      <Info>Drag the unconnected node onto the connection between nodes</Info>
      <div ref={ref} style={{ height: "100vh", width: "100vw" }}></div>
    </div>
  );
}
