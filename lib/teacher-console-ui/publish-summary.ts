export function publishSummary(p: {
  memberCount: number;
  groupCount: number;
  mapSize: number;
}): string {
  return (
    `將 snapshot 班級名單（${p.memberCount} 人）→ 隨機平衡分 ${p.groupCount} 組 ` +
    `→ 生成地圖（約 ${p.mapSize} 格）→ 投放第一波特殊/倍率格。\n\nPublish 後不可逆。`
  );
}
