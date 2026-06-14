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

const BLANK_DIAGRAM_BODY = 'dZHBDsIgDIafhvssic7z3PTiaQfPZNRBwtaFYTZ9erMATjK9ke//SkthvOjmsxWDupJEwyCTM+MnBrCDLGMAC3l6kkfQWi2DtIJavzDAqD20xDERHZFxekhhQ32PjUuYsJamVLuTSbsOosUNqBthtvSmpVOB7vbHNbigblVoncPBB52IcnjJqISk6QvxkvHCEjl/6uYCzbK8uBdfV/1JP4NZ7N2PAgbVejeDKvkhXr4B'
const FLOWCHART_DIAGRAM_BODY = '1ZbLkpswEEW/ppepEpINYgkYTzZZeZG1DM2jBhAl5Fe+PiUjDBhPajLjVJKdfLsb6Z5uC4BF9flFibb4JlOsgJL0DGwDlDqUEKDUKJde4YOQqzK1SaOwK3+gFYe0Q5liN0vUUla6bOdiIpsGEz3ThFLyNE/LZDXftRU5LoRdIqql+r1MdWFVx/XHwFcs88JuzanXB2oxJFsnXSFSeZpILAYWKSl1v6rPEVYG3sClr9u+Eb0dTGGj31PQaaF0X3QU1cH6g3gNYQScmEXgAQ/tafVlQKDkoUnRPMUBFp6KUuOuFYmJnpRogYWFrisbzsqqimQl1bWWpUmWoAcs7LSSrziJOK5gKwHM7ndEpfH8pjXnBqw+v6CsUasLUDKOWV9yuft9mrRs0IpJt9ZWE3ZK8tujR5BAt5blW1yxfYg1WAFfQeyBT4C7ELsQbCBYQ+xDEJjoM0FjlrlZ9gg0XbsM988Bzcg7QK/+EOgUk7IrZfMAtgs+h2BrqPsEAtcw5gT8AGIO4Ra4t4RdyHp/6H4bdJZlnunREnTme8xxnwN6fT/RhC9BOw9Ae6vPg8YmfTzQMfDIwObcYH7m+GYM+ePx9RImrryfQNVjf/GewDTHL/bIZv1rD5R08qASXNzdWqgc9f3VM2kDNmlgXnzANvtKJq9z7mOTiGW6pKWwEro8zk/4aev0o9YHj1Pn87vgP3DPPuZ+7nNK4PYn/afMA92OXzTX2OS7kMU/AQ=='
const MINDMAP_DIAGRAM_BODY = '1ddNk5owGAfwT/McdwYS5eUovmwve/LQc0yeQKaBMDGuup++gwaFwnbsDLbdG/6fRJJfYkCgy/L0alldvBmBGkggTkBXQEhIggAIaZLzNUnaILdK+Eb3YKs+0Idts4MSuO81dMZop+p+yE1VIXe9jFlrjv1m0uj+XWuW4yDYcqaH6XclXOHTMErvhW+o8sLfOiHxtVCytrGfyb5gwhw7EV0DXVpj3PWqPC1RN3ity7Xf5pPqbWAWK/dIB2dqxa+d3pk++PnBegZZAosVrOeQbSChPskyWKewIJAmfvzu3KKg1qreI9DsWCiH25rxpnK0rAaaFa7UQFch0EwqrZdGG3vpR1FgKptue2fND+xUYk4ZCqCZHyBah6dPJxre+MrTK5oSnT0DCXyHWSvut1yY+s/HzgLOfFZ01i4mft/4PZPfvvrOCmTjZceVd5ZVvHhhI9ARpBFkaQOdBpCGQILFgNaaQyUaiYvfH/JKGUk5xkvmEcXdNLy3n2bLG8yHvGSEd5ZMxrt7jDeblpdLIedjvGHE6IxNwxvF/5537JgY4V1OyiuljC9HwIBXpjENo+fsXhqOHA5P5hWP8a6m5UVJJBnjFZxEZCLeX3fvX+UtVSVeUOTYHr/N9e8nQoK9OViOg0ekYzZHN3amd5+DlVg07xhAV5WpsO/fX6xxNYuaOfXeH+Q0BLtnEOy+FAF/BgH/UgTiGQTi/yMAsrm/SV9qnf8jdP0T'
const SEQUENCE_DIAGRAM_BODY = '3ZZNc5swEIZ/zR4zA5LNxxEZnB7amU5z6FmGldFEICpE7PTXd8SHbRqcdsbJZNoberWLpPdZtADdVMd7w5vyiy5QAfGKI9AUCPGJ5wEhTnkelGgS9kYWY9BZeJA/cRSnsE4W2M4CrdbKymYu5rquMbczjRujD/MwodV81Ybv8YXwkHP1Uv0uC1uOqh/E54lPKPfluHREwmGi4lPweJK25IU+XEg0A7oxWtvhqTpuUDnzJl+GvO2V2dPGDNb2bxJ4brW540PaE1fdeELI1pBkkBDIAogiYCFkISQMku24cfs8udGWvHGPXaU+S4FK1giUNWhkhRYN0FSN8tezxg6ltPjQ8NylHgxvgLLSVgpo6gNlua4tl3WfPoyV4k0rd/2qHlBmMO9MK5/wG7ZDhThVd9attDmRd6KQSm200qbfMEUhAiGAstYa/YgXM2QdUNwBZaMhaCwer1rrn4BVx3vUFVrzDMSbEqKR8anIh+HhomKmMigvimU1iXys0v3p1WeQQLYjy9e47ha4BhBvIEod4CiBxP+fuOaiEOslrn7A6Yq/DddV+OFc8+XvNYU46rkSSKJ/H6cQIsRiCaeIQ+oHb4MzDD4QZ4s/7vwFmJH7Ht2dGwDzHc8+BIsXbem3UxKv1Z3JceFyt9zs0S7cDhclgnWRuPYINN0pnT/OWRvd1YUD0sNaNnU08c6fWrVBxa18mu/7VsvIVctYX/8BxHF/062BeX0HS103u8HE3TUT83c0cfWeHtJFD9kW4pXzMGYQZ643MAYx7c3MXOd4Dw/5TR4WvC37gf8nQ9dv5CeQ7fkPrZ+7+M+l2S8='
const ARCHITECTURE_DIAGRAM_BODY = '1ZdNb6MwEIZ/zRwrgR2+jiEhbaVW7W4Oe3b8AVYdjIzTJPvrVyROAoXurrpk1V4i5x0bPM87eADwbL27NaQqHjXjCpDHdoDngJCPPA8QapT9UYlPQm4kc5MuwlL+5E48TdtIxuvORKu1srLqilSXJae2oxFj9LY7TWjVvWtFct4TlpSovvpDMls41Q+TS+COy7xwt45RdAysyWmyy6QuCNPbloQzwDOjtT2O1rsZVw28E5fjusU70fPGDC/t3yygSjYzD6teidq4BH/wFSAPsgCmGUwRZCHEMaQRZBFMU5gu3O7t/oTE6E3JeHNVH3C6LaTly4rQJro1pAKcFnatXFhIpWZaaXNYi7kQoRCA09oa/cJbERSEmK8Ap26H3Fi+ezdV/wxwvbvles2t2QPy3ILEIXc154fu/7bl4MRpRcu8IHSF44omP1/5whXQwqEdxkwq2WO8rIwsc0De9Pl+XJxUMBEM4fRDgidkHJwYd3kmQR9ncCWcVCtFVj2id5pu6qr5ccUbzyFeQDaBdA7JbFTIQoioWdqHLJII++F1ICM8ULTXosz6hJ91bXPDl98eejDrglTNkO6VLBk3mP2Z6epowMPqLBD6kh9sedpYJUvu9PrYAvxgwAhPJMOHh8dJwJNxjAj9rhHxgA94wIco/ncfaqtN05DemvEoy/unQ6WHkIQQR4dKTyENP485gcDD5kQUk8PzcwVzzt31f7hDCS363nznTNbjHjhcIIGGUDKKQjTSgfMWJR7qkkMoR+mShhY3nOX8xu27Gf8+EeTVemMo77/NWGJybt+035YXvGTT5lUQ8HylNH3pwr845TmwfWSGK2Lla3eH4+SPxs2/3S+/CgL8MQRnq9v5sy+W+2TE3Dvd46sACD5Y/60679T/5Yz+VAQALS6feodY64MZZ78A'
const SWIMLANE_DIAGRAM_BODY = 'zZfBkqMgEIafpo+pUkgUj5oxs5c95bBnRlCpQUkhiZl5+i0UE02c2anajLs3/LtB+Lr9CwFvq/Ozpofyp2JcAvLYGfATIOQjzwOErPLWK2QQCi2YS7oKe/HOnTikHQXjzSTRKCWNOEzFTNU1z8xEo1qrdpqWKzl964EW/E7YZ1Teq78EM6VT/SC6Bn5wUZTu1QSFfaCiQ7I7SVNSptqRhFPAW62U6UfVeculhTdw6eftPoheNqZ5bb4yQdKarw5asWNm+rknKo/umJCuIYkhDiHdQISBuOUb8zaQaFpR2TUAJ6XS4l3VhkrATx7gpC2F4fsDzWxuq+nBJpnKhn3ASWOoNq62GAFOciHlVkmlu6Uxz/Mgz7tErV75KII2AeYvgBO3Y64NP38IwL9grc7PXFXc6DdAnpsQuUJcOrF/bK9lDQetHFXUH1qRulYqLitfaQPaOeCfwGe8EUU9w55AnEKSukG8KPt8k+N59mGGKWffwt6P/gH80wz5EGIPorXterKDaNmuz3KWb+bI+wHFa/ot5LG3JHlLb9VxmGEfdMi9jn1o3SeNINoC8Wwo8YGgu2podayZ7ckO8B/43zb69zuMH960uY/uYPtoBvY6eBBrzU+Ct/MWswPSNXpvMWkAUQBJZAexD4QsAfuRloJvYCO0NOyXo5BshnWHOEqtu5AUEu/qLukGEgIEL8H6kSayuXURvDRrzgq+cvu2488PgrxGHXU28vCxCxmqC24++GpGReE1i+0VEvDTi1TZ67QK05LN49NcUiNO090+hgX6Cxbj897BGHX1f8UC0O56We5io18OnP4G'
const ER_DIAGRAM_BODY = '1ZZRb5swFIV/jR8jgZ2G5HEhSSdVk6pF0x4nD1+DNWMjY0Lor58cDIGSRJWaquobnHuMueezwYjE+fHR0CL7oRlIhAN2RGSDMA5xECCMndK0yrITUiOYN52FvXgBL3a2SjAoR0artbSiGIuJVgoSO9KoMboe27iW41kLmsJE2CdUTtXfgtnMq+FidS58B5FmfuoljtpCTjuz76TMKNP1QCJbRGKjtW2v8mMM0oXX5dKO212p9i9mQNm3DABlhW1mVQmmHXqgsvJd/nJiFAuGcPD8hKLYuRTNAUUx5FRI34JtulzKjBbusqxFLqkCRNalpcZ6gniJyDrTRrxoZalEZBMisq4zYWFf0MRZakMLZ7J5V+ZCylhLbU5TEOB8wfnpwUb/g0EFPywI/EVk7RsBY+F4NZawDzs/PoLOwZoG4aAbMPd8mn7Jtvf1AHfktWxAujdSv8TS/tlnCgjvPIibUJhOqty98Gswm64whGOFlY6MrhWYPyd99/QphBLO+MMlQuGCkjm9D6E5eQOh1QcTKsDkoiyFVhNGz+dSFHckeyztXhrcGi3hM2BxziNgl2DxVUTCxX1gkWAMi5AprP6TeH9YZgYshVk4gaRrVbaiM9xuDgelrkwCV76blpoU7I39O+AKin1zfyFENtufOVVNB/as6hPtATejK8UcqU3gmUzTNiCpFYdxI/dIDk+SSw1V9n3ZjeO5kN/r3fWVEySTBA0kIA7wgevvC+aH8O589jnVBidIsv0P'
const STATE_DIAGRAM_BODY = '1ddBc6IwFADgX/OOnZFEIByJYPeypx72nJIXYBqNE2K1++t30Fhhjd0dF7fTm7y8SPLl+RCgi9X+0YpN891I1EBmcg+0AEIiMpsBIX3k7Rhhp0BtW+mTzoGn9if64Clt20rsRonOGO3azThYmfUaKzeKCWvNbpymjB7fdSNqvAg8VUJfRn+00jU+GiXZeeAbtnXjb81IehxYiVOy30nXCGl2gxAtgS6sMe74abVfoO7xTi7Hecsro+8Ls7h2fzOhc8Lhg7RCuePUV6G3fpdQMmAFsAzKFHIGfOnX7N5OEKh1u+kQKN81rcOnjaj6kZ0VG6C8cSsNtIiActVqvTDa2MM8qpgSqgLKO2fNCw5G5mkcJxlQ7peD1uH+6uaid7LV/hHNCp19AzI7TZh7ZV9mUeKvd8ND87FmcF4x87Xi66R+/+ozJZCl1/xIFmXr2nUdsE2BLyBLemReQhZBOQfOIC8mQ0alEqVCyCROKD5Pg0zjT0fuxCvKAHEMPAVODrJLyIo+kheQsemIKyVVHCKOEkHnYhriOPl84kbYj41jYDHwYxnnkPPpekWsaLiM04oKlPcxptF/Nxa2ato/VHIMvICMQJlAHkFOp1NGRRQJKcuKJCS5T7P4BGWUNT5EYeMFsNmhSaTA/Hb79I83S2ad2doKrzxQnbA1uqvPhOHRrWXe/zkBWjxrU72Mz8ua7Vr21X64Citb1MK1r+MFT0RGAmThvnob2UjlEm3Q478MGQ1WGWPAkt/a5G1kA5MA2KBjfxmxefh3GWh5N4oNUC7Jxg34y6DFAbQEWAT5QS+f9//i/wFtzHKffiZF19yZEMjy/F51GBu8ndLyFw=='

const graph = (compressedDiagram: string) =>
  `<mxfile host="embed.diagrams.net"><diagram name="第 1 页">${compressedDiagram}</diagram></mxfile>`

export const BLANK_DIAGRAM_XML = graph(BLANK_DIAGRAM_BODY)

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
    xml: graph(FLOWCHART_DIAGRAM_BODY),
  },
  {
    id: 'mindmap',
    name: '脑图',
    description: '拆解主题、方案和任务',
    category: 'planning',
    keywords: ['mind', 'map', '脑图', '主题', '方案'],
    accent: '#7c3aed',
    xml: graph(MINDMAP_DIAGRAM_BODY),
  },
  {
    id: 'sequence',
    name: '时序图',
    description: '接口调用、系统协作、消息流',
    category: 'process',
    keywords: ['sequence', '时序', '调用', '消息', '接口'],
    accent: '#f97316',
    xml: graph(SEQUENCE_DIAGRAM_BODY),
  },
  {
    id: 'architecture',
    name: '系统架构图',
    description: '前端、服务、协作、存储关系',
    category: 'system',
    keywords: ['architecture', '系统', '架构', '服务', '部署'],
    accent: '#0ea5e9',
    xml: graph(ARCHITECTURE_DIAGRAM_BODY),
  },
  {
    id: 'swimlane',
    name: '泳道图',
    description: '跨角色流程、职责分工',
    category: 'process',
    keywords: ['swimlane', '泳道', '角色', '职责', '跨团队'],
    accent: '#0891b2',
    xml: graph(SWIMLANE_DIAGRAM_BODY),
  },
  {
    id: 'er',
    name: 'ER 图',
    description: '实体、字段和关系建模',
    category: 'system',
    keywords: ['er', 'entity', 'relationship', '实体', '关系', '数据库'],
    accent: '#db2777',
    xml: graph(ER_DIAGRAM_BODY),
  },
  {
    id: 'state',
    name: '状态机',
    description: '状态迁移、生命周期和边界',
    category: 'process',
    keywords: ['state', 'machine', '状态', '生命周期', '迁移'],
    accent: '#475569',
    xml: graph(STATE_DIAGRAM_BODY),
  },
]

export function findDiagramTemplate(id: DiagramTemplateId) {
  return DIAGRAM_TEMPLATES.find((template) => template.id === id) || DIAGRAM_TEMPLATES[0]
}
