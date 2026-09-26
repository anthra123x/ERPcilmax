-- CreateIndex
CREATE INDEX "transactions_type_date_idx" ON "transactions"("type", "date");

-- CreateIndex
CREATE INDEX "transactions_type_categoryId_idx" ON "transactions"("type", "categoryId");

