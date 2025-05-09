import { DEFAULT_TENANT, ITenant } from '@metad/contracts';
import { Connection } from 'typeorm';
import { Tenant } from './tenant.entity';
import faker from 'faker';

export const getDefaultTenant = async (
	connection: Connection,
	tenantName: string = DEFAULT_TENANT
): Promise<Tenant> => {
	const repo = connection.getRepository(Tenant);
	const existedTenant = await repo.findOne({ where: { name: tenantName } });
	return existedTenant;
};

export const createDefaultTenant = async (
	connection: Connection,
	tenantName: string
): Promise<ITenant> => {
	const tenant: ITenant = {
		name: tenantName
	};
	await insertTenant(connection, tenant);
	return tenant;
};

export const createRandomTenants = async (
	connection: Connection,
	noOfTenants = 0
): Promise<Tenant[]> => {
	const randomTenants: Tenant[] = [];
	for (let i = 0; i < noOfTenants; i++) {
		const tenant = new Tenant();
		tenant.name = faker.company.companyName();
		randomTenants.push(tenant);
	}

	return await insertTenants(connection, randomTenants);
};

const insertTenant = async (
	connection: Connection,
	tenant: ITenant
): Promise<ITenant> => {
	const repo = connection.getRepository(Tenant);

	const existedTenant = await repo.findOne({ where: { name: tenant.name } });

	if (existedTenant) return existedTenant;
	else {
		await connection
			.createQueryBuilder()
			.insert()
			.into(Tenant)
			.values(tenant)
			.execute();

		return tenant;
	}
};

const insertTenants = async (
	connection: Connection,
	tenants: Tenant[]
): Promise<Tenant[]> => {
	return await connection.manager.save(tenants);
};
