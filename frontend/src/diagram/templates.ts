export type DiagramTemplateId =
  | 'blank'
  | 'flowchart'
  | 'mindmap'
  | 'sequence'
  | 'architecture'
  | 'swimlane'
  | 'er'
  | 'state'

export type DiagramTemplateCategory = 'basic' | 'process' | 'planning' | 'system'

export interface DiagramTemplate {
  id: DiagramTemplateId
  name: string
  description: string
  category: DiagramTemplateCategory
  keywords: string[]
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
    category: 'basic',
    keywords: ['blank', '空白', '画布'],
    accent: '#2563eb',
    xml: BLANK_DIAGRAM_XML,
  },
  {
    id: 'flowchart',
    name: '流程图',
    description: '业务流、审批流、状态流',
    category: 'process',
    keywords: ['flow', 'process', '流程', '审批', '步骤'],
    accent: '#16a34a',
    xml: graph(
      '<mxCell id="start" value="开始" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="120" y="120" width="120" height="50" as="geometry"/></mxCell><mxCell id="step" value="处理步骤" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="300" y="120" width="140" height="50" as="geometry"/></mxCell><mxCell id="decision" value="是否通过" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="520" y="108" width="110" height="74" as="geometry"/></mxCell><mxCell id="end" value="完成" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f3e8ff;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="730" y="120" width="120" height="50" as="geometry"/></mxCell><mxCell id="edge-1" edge="1" parent="1" source="start" target="step" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="edge-2" edge="1" parent="1" source="step" target="decision" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="edge-3" edge="1" parent="1" source="decision" target="end" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'mindmap',
    name: '脑图',
    description: '拆解主题、方案和任务',
    category: 'planning',
    keywords: ['mind', 'map', '脑图', '主题', '方案'],
    accent: '#7c3aed',
    xml: graph(
      '<mxCell id="topic" value="中心主题" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ede9fe;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="420" y="190" width="140" height="72" as="geometry"/></mxCell><mxCell id="branch-a" value="方向 A" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="210" y="105" width="120" height="48" as="geometry"/></mxCell><mxCell id="branch-b" value="方向 B" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="670" y="105" width="120" height="48" as="geometry"/></mxCell><mxCell id="branch-c" value="方向 C" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="210" y="310" width="120" height="48" as="geometry"/></mxCell><mxCell id="branch-d" value="方向 D" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#dc2626;" vertex="1" parent="1"><mxGeometry x="670" y="310" width="120" height="48" as="geometry"/></mxCell><mxCell id="mind-edge-a" edge="1" parent="1" source="topic" target="branch-a" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="mind-edge-b" edge="1" parent="1" source="topic" target="branch-b" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="mind-edge-c" edge="1" parent="1" source="topic" target="branch-c" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="mind-edge-d" edge="1" parent="1" source="topic" target="branch-d" style="endArrow=none;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'sequence',
    name: '时序图',
    description: '接口调用、系统协作、消息流',
    category: 'process',
    keywords: ['sequence', '时序', '调用', '消息', '接口'],
    accent: '#f97316',
    xml: graph(
      '<mxCell id="actor-a" value="客户端" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="180" y="80" width="120" height="420" as="geometry"/></mxCell><mxCell id="actor-b" value="服务端" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="470" y="80" width="120" height="420" as="geometry"/></mxCell><mxCell id="actor-c" value="存储" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="760" y="80" width="120" height="420" as="geometry"/></mxCell><mxCell id="seq-1" value="请求" edge="1" parent="1" source="actor-a" target="actor-b" style="endArrow=block;html=1;rounded=0;"><mxGeometry y="-110" relative="1" as="geometry"/></mxCell><mxCell id="seq-2" value="读写数据" edge="1" parent="1" source="actor-b" target="actor-c" style="endArrow=block;html=1;rounded=0;"><mxGeometry y="-40" relative="1" as="geometry"/></mxCell><mxCell id="seq-3" value="返回结果" edge="1" parent="1" source="actor-b" target="actor-a" style="endArrow=block;html=1;rounded=0;dashed=1;"><mxGeometry y="50" relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'architecture',
    name: '系统架构图',
    description: '前端、服务、协作、存储关系',
    category: 'system',
    keywords: ['architecture', '系统', '架构', '服务', '部署'],
    accent: '#0ea5e9',
    xml: graph(
      '<mxCell id="client" value="Web 客户端" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="90" y="160" width="140" height="56" as="geometry"/></mxCell><mxCell id="api" value="Spring API" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="330" y="95" width="150" height="56" as="geometry"/></mxCell><mxCell id="collab" value="Hocuspocus 协作" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="330" y="230" width="150" height="56" as="geometry"/></mxCell><mxCell id="db" value="PostgreSQL" style="shape=cylinder3d;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#f0f9ff;strokeColor=#0ea5e9;" vertex="1" parent="1"><mxGeometry x="610" y="80" width="130" height="78" as="geometry"/></mxCell><mxCell id="storage" value="MinIO 文件" style="shape=cylinder3d;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#f5f3ff;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="610" y="220" width="130" height="78" as="geometry"/></mxCell><mxCell id="cache" value="Redis" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#dc2626;" vertex="1" parent="1"><mxGeometry x="610" y="360" width="130" height="56" as="geometry"/></mxCell><mxCell id="arch-edge-1" edge="1" parent="1" source="client" target="api" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="arch-edge-2" edge="1" parent="1" source="client" target="collab" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="arch-edge-3" edge="1" parent="1" source="api" target="db" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="arch-edge-4" edge="1" parent="1" source="api" target="storage" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="arch-edge-5" edge="1" parent="1" source="collab" target="cache" style="endArrow=block;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'swimlane',
    name: '泳道图',
    description: '跨角色流程、职责分工',
    category: 'process',
    keywords: ['swimlane', '泳道', '角色', '职责', '跨团队'],
    accent: '#0891b2',
    xml: graph(
      '<mxCell id="lane-product" value="产品" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=32;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="90" y="80" width="780" height="110" as="geometry"/></mxCell><mxCell id="lane-design" value="设计" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=32;fillColor=#f5f3ff;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="90" y="190" width="780" height="110" as="geometry"/></mxCell><mxCell id="lane-dev" value="研发" style="swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=32;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="90" y="300" width="780" height="110" as="geometry"/></mxCell><mxCell id="swim-start" value="提出需求" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="170" y="112" width="120" height="46" as="geometry"/></mxCell><mxCell id="swim-review" value="评审方案" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="370" y="222" width="120" height="46" as="geometry"/></mxCell><mxCell id="swim-build" value="实现发布" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="590" y="332" width="120" height="46" as="geometry"/></mxCell><mxCell id="swim-edge-1" edge="1" parent="1" source="swim-start" target="swim-review" style="endArrow=block;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="swim-edge-2" edge="1" parent="1" source="swim-review" target="swim-build" style="endArrow=block;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'er',
    name: 'ER 图',
    description: '实体、字段和关系建模',
    category: 'system',
    keywords: ['er', 'entity', 'relationship', '实体', '关系', '数据库'],
    accent: '#db2777',
    xml: graph(
      '<mxCell id="entity-user" value="User|id PK|username|email" style="shape=swimlane;startSize=28;horizontal=1;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="140" y="120" width="170" height="120" as="geometry"/></mxCell><mxCell id="entity-document" value="Document|id PK|title|owner_id FK" style="shape=swimlane;startSize=28;horizontal=1;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="430" y="120" width="190" height="120" as="geometry"/></mxCell><mxCell id="entity-permission" value="Permission|document_id FK|user_id FK|role" style="shape=swimlane;startSize=28;horizontal=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#f97316;" vertex="1" parent="1"><mxGeometry x="300" y="330" width="220" height="120" as="geometry"/></mxCell><mxCell id="er-edge-1" value="owns" edge="1" parent="1" source="entity-user" target="entity-document" style="endArrow=ERmany;startArrow=ERone;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="er-edge-2" value="grants" edge="1" parent="1" source="entity-document" target="entity-permission" style="endArrow=ERmany;startArrow=ERone;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="er-edge-3" value="receives" edge="1" parent="1" source="entity-user" target="entity-permission" style="endArrow=ERmany;startArrow=ERone;html=1;rounded=0;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
  {
    id: 'state',
    name: '状态机',
    description: '状态迁移、生命周期和边界',
    category: 'process',
    keywords: ['state', 'machine', '状态', '生命周期', '迁移'],
    accent: '#475569',
    xml: graph(
      '<mxCell id="state-draft" value="草稿" style="ellipse;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#475569;" vertex="1" parent="1"><mxGeometry x="140" y="160" width="110" height="58" as="geometry"/></mxCell><mxCell id="state-editing" value="编辑中" style="ellipse;whiteSpace=wrap;html=1;fillColor=#eff6ff;strokeColor=#2563eb;" vertex="1" parent="1"><mxGeometry x="350" y="160" width="110" height="58" as="geometry"/></mxCell><mxCell id="state-saved" value="已保存" style="ellipse;whiteSpace=wrap;html=1;fillColor=#ecfdf5;strokeColor=#16a34a;" vertex="1" parent="1"><mxGeometry x="560" y="160" width="110" height="58" as="geometry"/></mxCell><mxCell id="state-shared" value="已共享" style="ellipse;whiteSpace=wrap;html=1;fillColor=#f5f3ff;strokeColor=#7c3aed;" vertex="1" parent="1"><mxGeometry x="560" y="310" width="110" height="58" as="geometry"/></mxCell><mxCell id="state-archived" value="已归档" style="ellipse;whiteSpace=wrap;html=1;fillColor=#fef2f2;strokeColor=#dc2626;" vertex="1" parent="1"><mxGeometry x="350" y="310" width="110" height="58" as="geometry"/></mxCell><mxCell id="state-edge-1" value="开始" edge="1" parent="1" source="state-draft" target="state-editing" style="endArrow=block;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="state-edge-2" value="保存" edge="1" parent="1" source="state-editing" target="state-saved" style="endArrow=block;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="state-edge-3" value="分享" edge="1" parent="1" source="state-saved" target="state-shared" style="endArrow=block;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="state-edge-4" value="归档" edge="1" parent="1" source="state-shared" target="state-archived" style="endArrow=block;html=1;rounded=1;"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="state-edge-5" value="恢复" edge="1" parent="1" source="state-archived" target="state-editing" style="endArrow=block;html=1;rounded=1;dashed=1;"><mxGeometry relative="1" as="geometry"/></mxCell>',
    ),
  },
]

export function findDiagramTemplate(id: DiagramTemplateId) {
  return DIAGRAM_TEMPLATES.find((template) => template.id === id) || DIAGRAM_TEMPLATES[0]
}
