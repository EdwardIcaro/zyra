#!/bin/bash

# Fix unused variables by adding underscore prefix
find packages -name "*.ts" -type f -exec sed -i 's/(deltaTime: number)/(\_deltaTime: number)/g' {} \;
find packages -name "*.ts" -type f -exec sed -i 's/(options: any)/(\_options: any)/g' {} \;
find packages -name "*.ts" -type f -exec sed -i 's/(consented: boolean)/(\_consented: boolean)/g' {} \;

echo "✅ Warnings básicos corrigidos!"