/** Small, uncompressed ZIP writer: PNGs are already compressed. No new dependency. */
export function imageZip(files: Array<{ name: string; bytes: Uint8Array }>): Uint8Array {
  const locals: Buffer[] = [], directory: Buffer[] = []; let offset = 0;
  for (const file of files) {
    if (!/^[a-zA-Z0-9_.-]+\.png$/.test(file.name)) throw new Error("invalid_zip_filename");
    const bytes = Buffer.from(file.bytes), name = Buffer.from(file.name);
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(bytes.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, bytes);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(33, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, name); offset += local.length + name.length + bytes.length;
  }
  const size = directory.reduce((sum, b) => sum + b.length, 0);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, ...directory, end]));
}
