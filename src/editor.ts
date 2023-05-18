import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset, Control } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets
} from "rete-connection-plugin";
import {
  ReactRenderPlugin,
  Presets,
  ReactArea2D
} from "rete-react-render-plugin";
import {
  AutoArrangePlugin,
  Presets as ArrangePresets,
  ArrangeAppliers
} from "rete-auto-arrange-plugin";
import {
  ContextMenuPlugin,
  Presets as ContextMenuPresets,
  ContextMenuExtra
} from "rete-context-menu-plugin";
import { DataflowEngine } from "rete-engine";

import { easeInOut } from "popmotion";
import { checkIntersection, insertableNodes } from "./insert-node";

import { MyControl } from "./Control";

const socket = new ClassicPreset.Socket("socket");

// 追加するノードの定義
class Node extends ClassicPreset.Node<
  {},
  { value: ClassicPreset.Socket },
  { value: ClassicPreset.InputControl<"text"> }
> {
  width = 200;
  height = 360;

  constructor(initial: number, change?: () => void) {
    super("Node");

    // コントロール配置
    this.addControl(
      "flag",
      new ClassicPreset.InputControl("text", { initial: "flag" })
    );
    this.addControl(
      "state",
      new ClassicPreset.InputControl("text", { initial: "state" })
    );
    this.addControl(
      "system",
      new ClassicPreset.InputControl("text", { initial: "system" })
    );
    this.addControl(
      "example",
      new ClassicPreset.InputControl("text", { initial: "example" })
    );
    this.addControl(
      "type",
      new ClassicPreset.InputControl("text", { initial: "type" })
    );
    this.addControl(
      "next",
      new ClassicPreset.InputControl("text", { initial, change })
    );

    // ソケット配置
    this.addInput("state", new ClassicPreset.Input(socket, "state"));
    this.addOutput("next", new ClassicPreset.Input(socket, "next"));

    //console.log("id=%s", this.id.toString());
  }

  data(): { value: string } {
    return {
      value: this.controls.value.value || 0
    };
  }
}

//---------------------------------------

class Connection<N extends Node> extends ClassicPreset.Connection<N, N> {}

type Schemes = GetSchemes<Node, Connection<Node>>;
type AreaExtra = ReactArea2D<Schemes> | ContextMenuExtra<Schemes>;

export async function createEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactRenderPlugin<Schemes>({ createRoot });
  const arrange = new AutoArrangePlugin<Schemes>();
  const engine = new DataflowEngine<Schemes>();

  function process() {
    engine.reset();

    editor
      .getNodes()
      .filter((n) => n instanceof Node)
      .forEach((n) => engine.fetch(n.id));
  }

  const contextMenu = new ContextMenuPlugin<Schemes, AreaExtra>({
    items: ContextMenuPresets.classic.setup([["Node", () => new Node()]])
  });
  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl()
  });

  render.addPreset(Presets.classic.setup({ area }));
  render.addPreset(Presets.contextMenu.setup());

  connection.addPreset(ConnectionPresets.classic.setup());

  arrange.addPreset(ArrangePresets.classic.setup());

  editor.use(area);
  editor.use(engine);
  area.use(connection);
  area.use(render);
  area.use(arrange);
  area.use(contextMenu);

  const animatedApplier = new ArrangeAppliers.TransitionApplier<Schemes, never>(
    {
      duration: 500,
      timingFunction: easeInOut
    }
  );

  AreaExtensions.simpleNodesOrder(area);

  insertableNodes(area, {
    async createConnections(node, connection) {
      await editor.addConnection(
        new Connection(
          editor.getNode(connection.source),
          //connection.sourceOutput,
          "next",
          node,
          "state"
        )
      );
      await editor.addConnection(
        new Connection(
          node,
          "next",
          editor.getNode(connection.target),
          //connection.targetInput
          "state"
        )
      );
      arrange.layout({
        applier: animatedApplier
      });
    }
  });

  const a = new Node("next", process);
  const b = new Node();
  const c = new Node();
  // const d = new Node();
  console.log("a=%s", a.id.toString());
  console.log("b=%s", b.id.toString());
  console.log("c=%s", c.id.toString());

  await editor.addNode(a);
  await editor.addNode(b);
  await editor.addNode(c);

  await editor.addConnection(new Connection(a, "next", b, "state"));
  await editor.addConnection(new Connection(b, "next", c, "state"));

  await arrange.layout();
  AreaExtensions.zoomAt(area, editor.getNodes());
  return {
    destroy: () => area.destroy()
  };
}
