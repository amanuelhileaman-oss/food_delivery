-- DropIndex
DROP INDEX "Favorite_userId_restaurantId_foodId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_restaurantId_key" ON "Favorite"("userId", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_foodId_key" ON "Favorite"("userId", "foodId");
