#!/bin/bash
# Script to rename route folders from English to Turkish

cd "$(dirname "$0")/../apps/web-app/src/app/(protected)" || exit 1

# Rename folders
if [ -d "dashboard" ]; then
  mv dashboard anasayfa
  echo "✓ Renamed dashboard → anasayfa"
fi

if [ -d "clients" ]; then
  mv clients musteriler
  echo "✓ Renamed clients → musteriler"
fi

if [ -d "invoices" ]; then
  mv invoices faturalar
  echo "✓ Renamed invoices → faturalar"
fi

if [ -d "transactions" ]; then
  mv transactions islemler
  echo "✓ Renamed transactions → islemler"
fi

if [ -d "documents" ]; then
  mv documents belgeler
  echo "✓ Renamed documents → belgeler"
fi

# Handle settings folder - merge with ayarlar if needed
if [ -d "settings" ]; then
  if [ -d "ayarlar" ]; then
    # Move settings/users to ayarlar/kullanicilar
    if [ -d "settings/users" ]; then
      mkdir -p ayarlar/kullanicilar
      mv settings/users/* ayarlar/kullanicilar/ 2>/dev/null || true
      rmdir settings/users 2>/dev/null || true
    fi
    rmdir settings 2>/dev/null || true
    echo "✓ Merged settings into ayarlar"
  else
    mv settings ayarlar
    echo "✓ Renamed settings → ayarlar"
  fi
fi

cd ../../.. || exit 1

# Rename integrations folder if it exists at app level
if [ -d "app/integrations" ]; then
  mv app/integrations app/entegrasyonlar
  echo "✓ Renamed integrations → entegrasyonlar"
fi

echo ""
echo "✅ All route folders renamed successfully!"



