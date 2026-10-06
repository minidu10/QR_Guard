import { Schema } from 'mongoose';

// Makes documents look nice in JSON: "id" instead of "_id", no "__v".
// Fields listed in `hidden` (like passwordHash) are removed.
export function cleanJson(schema: Schema, hidden: string[] = []) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      for (const key of hidden) delete ret[key];
      return ret;
    },
  });
}
