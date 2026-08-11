#!/usr/bin/env node
/*
  Patches android/app/src/main/AndroidManifest.xml to add the permissions
  the app needs:
   - READ_CONTACTS / WRITE_CONTACTS  (contact picker for phone fields)
   - CAMERA                          (payment slips)
   - READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE  (file save/pick on older Android)
   - REQUEST_INSTALL_PACKAGES        (allow user to install downloaded updates)
   - usesCleartextTraffic="true"     (safety for local dev URLs)
*/
const fs = require('fs');
const path = require('path');

const manifestPath = path.join('android','app','src','main','AndroidManifest.xml');
if (!fs.existsSync(manifestPath)){
  console.error('❌ AndroidManifest.xml not found:', manifestPath);
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');

const perms = [
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.CAMERA',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.INTERNET',
  'android.permission.VIBRATE',
];
let added = 0;
for (const p of perms){
  if (!xml.includes(`android:name="${p}"`)){
    xml = xml.replace(
      '</manifest>',
      `    <uses-permission android:name="${p}" />\n</manifest>`
    );
    added++;
  }
}

// Camera feature (not required — user might not have a camera)
if (!xml.includes('uses-feature android:name="android.hardware.camera"')){
  xml = xml.replace(
    '</manifest>',
    `    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>`
  );
}

// Cleartext traffic + supportsRtl
if (!xml.includes('android:usesCleartextTraffic')){
  xml = xml.replace(/(<application\s[^>]*)/, '$1 android:usesCleartextTraffic="true"');
}
if (!xml.includes('android:supportsRtl')){
  xml = xml.replace(/(<application\s[^>]*)/, '$1 android:supportsRtl="true"');
}

fs.writeFileSync(manifestPath, xml);
console.log(`✅ AndroidManifest patched (${added} new perms).`);

// Patch strings.xml for app name in Arabic
const stringsPath = path.join('android','app','src','main','res','values','strings.xml');
if (fs.existsSync(stringsPath)){
  let s = fs.readFileSync(stringsPath,'utf8');
  s = s.replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">فهد التميمي</string>');
  s = s.replace(/<string name="title_activity_main">[^<]*<\/string>/, '<string name="title_activity_main">فهد التميمي</string>');
  fs.writeFileSync(stringsPath, s);
  console.log('✅ strings.xml patched (Arabic app name).');
}

// Ensure gradle wrapper is executable
const gwPath = path.join('android','gradlew');
if (fs.existsSync(gwPath)){
  try { fs.chmodSync(gwPath, 0o755); console.log('✅ gradlew chmod +x'); } catch(e){}
}
