import { DataSource } from 'typeorm';
import { getTypeORMConfig } from '../../config/orm.config';

export const seedDataSource = new DataSource(getTypeORMConfig());
