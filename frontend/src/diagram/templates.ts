export type DiagramTemplateId = 'blank' | 'flowchart' | 'mindmap' | 'sequence'

export interface DiagramTemplate {
  id: DiagramTemplateId
  name: string
  description: string
  accent: string
  xml: string
}

const graph = (cells: string) =>
  `<mxfile host="embed.diagrams.net"><diagram name="第 1 页"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`

export const BLANK_DIAGRAM_XML = graph('')

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'blank',
    name: '空白图示',
    description: '从空白画布开始',
    accent: '#2563eb',
    xml: BLANK_DIAGRAM_XML,
  },
  {
    id: 'flowchart',
    name: '流程图',
    description: '业务流、审批流、状态流',
    accent: '#16a34a',
    xml: graph(
      '<mxCell id="start" value="开始" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="120" y="120" width="120" height="50" as="geometry"/></mxCell><mxCell id="step" value="处理步骤" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="300" y="120" width="140" height="50" as="geometry"/></mxCell><mxCell id="decision" value="是否通过" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="520" y="108" width="110" height="74" as="geometry"/></mxCell><mxCell id="end" value="完成" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f3e8ff;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="730" y="120" width="120" height="50" as="geometry"/></mxCell><mxCell id="edge-1" edge="1" parent="1" source="start" target="step" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="edge-2" edge="1" parent="1" source="step" target="decision" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="edge-3" edge="1" parent="1" source="decision" target="end" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'mindmap',
    name: '脑图',
    description: '拆解主题、方案和任务',
    accent: '#7c3aed',
    xml: graph(
      '<mxCell id="topic" value="中心主题" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ede9fe;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="420" y="190" width="140" height="72" as="geometry"/></mxCell><mxCell id="branch-a" value="方向 A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="210" y="105" width="120" height="48" as="geometry"/></mxCell><mxCell id="branch-b" value="方向 B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="670" y="105" width="120" height="48" as="geometry"/></mxCell><mxCell id="branch-c" value="方向 C" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="210" y="310" width="120" height="48" as="geometry"/></mxCell><mxCell id="branch-d" value="方向 D" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#dc2626;" vertex="1" parent="1"><mxGeometry x="670" y="310" width="120" height="48" as="geometry"/></mxCell><mxCell id="mind-edge-a" edge="1" parent="1" source="topic" target="branch-a" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="mind-edge-b" edge="1" parent="1" source="topic" target="branch-b" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="mind-edge-c" edge="1" parent="1" source="topic" target="branch-c" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="mind-edge-d" edge="1" parent="1" source="topic" target="branch-d" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'sequence',
    name: '时序图',
    description: '接口调用、系统协作、消息流',
    accent: '#f97316',
    xml: graph(
      '<mxCell id="actor-a" value="客户端" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="180" y="80" width="120" height="420" as="geometry"/></mxCell><mxCell id="actor-b" value="服务端" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="470" y="80" width="120" height="420" as="geometry"/></mxCell><mxCell id="actor-c" value="存储" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="760" y="80" width="120" height="420" as="geometry"/></mxCell><mxCell id="seq-1" value="请求" edge="1" parent="1" source="actor-a" target="actor-b" style="endArrow=block;html=1;rounded=0;"><mxGeometry y="-110" relative="1" as="geometry"/></mxCell><mxCell id="seq-2" value="读写数据" edge="1" parent="1" source="actor-b" target="actor-c" style="endArrow=block;html=1;rounded=0;"><mxGeometry y="-40" relative="1" as="geometry"/></mxCell><mxCell id="seq-3" value="返回结果" edge="1" parent="1" source="actor-b" target="actor-a" style="endArrow=block;html=1;rounded=0;dashed=1;"><mxGeometry y="50" relative="1" as="geometry"/></mxCell>',
    ),
  },
]

export function findDiagramTemplate(id: DiagramTemplateId) {
  return DIAGRAM_TEMPLATES.find((template) => template.id === id) || DIAGRAM_TEMPLATES[0]
}
