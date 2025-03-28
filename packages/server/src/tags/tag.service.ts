import { IPagination, ITag } from '@metad/contracts'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindManyOptions, Repository } from 'typeorm'
import { RequestContext, TenantOrganizationAwareCrudService } from '../core'
import { Tag } from './tag.entity'

@Injectable()
export class TagService extends TenantOrganizationAwareCrudService<Tag> {
	constructor(
		@InjectRepository(Tag)
		private readonly tagRepository: Repository<Tag>
	) {
		super(tagRepository)
	}

	/**
	 * Find all tag in org and tenant
	 * @param filter
	 * @returns
	 */
	public async findAll(filter?: FindManyOptions<Tag>): Promise<IPagination<Tag>> {
		const organizationId = RequestContext.getOrganizationId()
		const tenantTags = await super.findAllWithoutOrganization(filter)
		if (organizationId) {
			const orgTags = await super.findAll(filter)
			return {
				total: tenantTags.total + orgTags.total,
				items: [...orgTags.items, ...tenantTags.items]
			}
		}
		return tenantTags
	}

	async findAllCategories(): Promise<{ category: string }[]> {
		const organizationId = RequestContext.getOrganizationId();
		const tenantId = RequestContext.currentTenantId()
		const categories = this.tagRepository.createQueryBuilder('tag')
			.select('DISTINCT tag.category')
			.where('tag.tenantId = :tenantId', { tenantId })
			.where('tag.organizationId = :organizationId OR tag.organizationId IS NULL', { organizationId })
			.getRawMany();
		return categories
	}

	async findOneByName(name: string): Promise<Tag> {
		const query = this.tagRepository.createQueryBuilder('tag').where('"tag"."name" = :name', {
			name
		})
		const item = await query.getOne()
		return item
	}

	async findTagsByOrgLevel(relations: string[], findInput: ITag): Promise<any> {
		const { organizationId, tenantId } = findInput
		const allTags = await this.tagRepository.find({
			where: [{ organizationId, tenantId, isSystem: false }],
			relations: relations
		})
		return allTags
	}
	async findTagsByTenantLevel(relations: string[], findInput: ITag): Promise<any> {
		const { tenantId } = findInput
		const allTags = await this.tagRepository.find({
			where: [{ tenantId, isSystem: false }],
			relations: relations
		})
		return allTags
	}

	async getTagUsageCount(organizationId: any): Promise<any> {
		const allTagsInOrg = await this.tagRepository
			.createQueryBuilder('tag')
			.select('*')
			.where('tag.organization = :organizationId', {
				organizationId
			})
			.andWhere('tag.isSystem = :action', {
				action: false
			})
			.getRawMany()

		const allTagsIds = []
		allTagsInOrg.forEach((tag) => allTagsIds.push(tag.id))

		const tagCounterAllRelations = await this.tagRepository
			.createQueryBuilder('tag')
			.leftJoinAndSelect('tag.candidate', 'candidate')
			.leftJoinAndSelect('tag.employee', 'employee')
			.leftJoinAndSelect('tag.equipment', 'equipment')
			.leftJoinAndSelect('tag.eventType', 'eventType')
			.leftJoinAndSelect('tag.income', 'income')
			.leftJoinAndSelect('tag.expense', 'expense')
			.leftJoinAndSelect('tag.invoice', 'invoice')
			.leftJoinAndSelect('tag.task', 'task')
			.leftJoinAndSelect('tag.proposal', 'proposal')
			.leftJoinAndSelect('tag.organizationVendor', 'organizationVendor')
			.leftJoinAndSelect('tag.organizationTeam', 'organizationTeam')
			.leftJoinAndSelect('tag.organizationProject', 'organizationProject')
			.leftJoinAndSelect('tag.organizationPosition', 'organizationPosition')
			.leftJoinAndSelect('tag.expenseCategory', 'expenseCategory')
			.leftJoinAndSelect('tag.organizationEmploymentType', 'organizationEmploymentType')
			.leftJoinAndSelect('tag.employeeLevel', 'employeeLevel')
			.leftJoinAndSelect('tag.organizationDepartment', 'organizationDepartment')
			.leftJoinAndSelect('tag.organizationContact', 'organizationContact')
			.leftJoinAndSelect('tag.product', 'product')
			.leftJoinAndSelect('tag.payment', 'payment')
			.where('tag.id IN (:...id)', { id: allTagsIds })
			.andWhere('tag.isSystem = :action', { action: false })
			.getMany()

		let tagWithCounter = {}
		const tagsWithCounter = []

		for (let arrayIndex = 0; arrayIndex < allTagsInOrg.length; arrayIndex++) {
			tagWithCounter = {
				...tagCounterAllRelations[arrayIndex]
				// counter:
				// 	tagCounterAllRelations[arrayIndex].candidate.length +
				// 	tagCounterAllRelations[arrayIndex].employee.length +
				// 	tagCounterAllRelations[arrayIndex].equipment.length +
				// 	tagCounterAllRelations[arrayIndex].eventType.length +
				// 	tagCounterAllRelations[arrayIndex].income.length +
				// 	tagCounterAllRelations[arrayIndex].expense.length +
				// 	tagCounterAllRelations[arrayIndex].invoice.length +
				// 	tagCounterAllRelations[arrayIndex].task.length +
				// 	tagCounterAllRelations[arrayIndex].proposal.length +
				// 	tagCounterAllRelations[arrayIndex].organizationVendor
				// 		.length +
				// 	tagCounterAllRelations[arrayIndex].organizationTeam.length +
				// 	tagCounterAllRelations[arrayIndex].organizationProject
				// 		.length +
				// 	tagCounterAllRelations[arrayIndex].organizationPosition
				// 		.length +
				// 	tagCounterAllRelations[arrayIndex].expenseCategory.length +
				// 	tagCounterAllRelations[arrayIndex]
				// 		.organizationEmploymentType.length +
				// 	tagCounterAllRelations[arrayIndex].employeeLevel.length +
				// 	tagCounterAllRelations[arrayIndex].organizationDepartment
				// 		.length +
				// 	tagCounterAllRelations[arrayIndex].organizationContact
				// 		.length +
				// 	tagCounterAllRelations[arrayIndex].product.length +
				// 	tagCounterAllRelations[arrayIndex].payment.length
			}
			tagsWithCounter.push(tagWithCounter)
		}

		return tagsWithCounter
	}
}
