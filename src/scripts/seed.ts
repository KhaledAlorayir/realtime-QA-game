import { CATEGORY } from "lib/const";
import { dao } from "lib/dao";

async function seedMasterData() {
  await Promise.all(
    Object.values(CATEGORY).map(async (category) =>
      dao.createCategory({ name: category })
    )
  );
}

await seedMasterData();
process.exit(0);
