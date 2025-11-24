const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTemplate() {
  try {
    console.log('开始创建"增加测试模版"...\n');
    
    // 1. 创建或获取任务集
    console.log('1. 创建任务集...');
    const groups = {};
    const groupNames = ['听课', '看直播', '看书', '做题', '作文'];
    
    for (const name of groupNames) {
      let group = await prisma.platformTaskGroup.findFirst({
        where: { name }
      });
      
      if (!group) {
        group = await prisma.platformTaskGroup.create({
          data: { name }
        });
        console.log(`   ✓ 创建任务集: ${name} (ID: ${group.id})`);
      } else {
        console.log(`   ✓ 使用现有任务集: ${name} (ID: ${group.id})`);
      }
      groups[name] = group.id;
    }
    
    // 2. 创建任务集中的任务实例
    console.log('\n2. 创建任务实例...');
    const tasks = {};
    
    // 听课任务集：Day1-7
    for (let i = 1; i <= 7; i++) {
      const taskName = `听课-${i}`;
      let task = await prisma.platformTask.findFirst({
        where: { name: taskName }
      });
      if (!task) {
        task = await prisma.platformTask.create({
          data: {
            name: taskName,
            timing_type: 'POMODORO',
            occupation_time: 180
          }
        });
      }
      tasks[taskName] = task.id;
    }
    console.log(`   ✓ 听课任务: 7个`);
    
    // 看直播任务集：Day1-10
    for (let i = 1; i <= 10; i++) {
      const taskName = `看直播-${i}`;
      let task = await prisma.platformTask.findFirst({
        where: { name: taskName }
      });
      if (!task) {
        task = await prisma.platformTask.create({
          data: {
            name: taskName,
            timing_type: 'POMODORO',
            occupation_time: 180
          }
        });
      }
      tasks[taskName] = task.id;
    }
    console.log(`   ✓ 看直播任务: 10个`);
    
    // 看书任务集：Day1-7
    for (let i = 1; i <= 7; i++) {
      const taskName = `看书-${i}`;
      let task = await prisma.platformTask.findFirst({
        where: { name: taskName }
      });
      if (!task) {
        task = await prisma.platformTask.create({
          data: {
            name: taskName,
            timing_type: 'POMODORO',
            occupation_time: 120
          }
        });
      }
      tasks[taskName] = task.id;
    }
    console.log(`   ✓ 看书任务: 7个`);
    
    // 做题任务集：Day1-10
    for (let i = 1; i <= 10; i++) {
      const taskName = `做题-${i}`;
      let task = await prisma.platformTask.findFirst({
        where: { name: taskName }
      });
      if (!task) {
        task = await prisma.platformTask.create({
          data: {
            name: taskName,
            timing_type: 'POMODORO',
            occupation_time: 60
          }
        });
      }
      tasks[taskName] = task.id;
    }
    console.log(`   ✓ 做题任务: 10个`);
    
    // 作文任务集：Day8-10
    for (let i = 8; i <= 10; i++) {
      const taskName = `作文-${i}`;
      let task = await prisma.platformTask.findFirst({
        where: { name: taskName }
      });
      if (!task) {
        task = await prisma.platformTask.create({
          data: {
            name: taskName,
            timing_type: 'POMODORO',
            occupation_time: 60
          }
        });
      }
      tasks[taskName] = task.id;
    }
    console.log(`   ✓ 作文任务: 3个`);
    
    // 独立任务
    const standaloneTasks = {
      '健身': 60,
      '跳舞': 60,
      '玩耍': 30,
      '单词30min': 30
    };
    
    for (const [name, time] of Object.entries(standaloneTasks)) {
      let task = await prisma.platformTask.findFirst({
        where: { name }
      });
      if (!task) {
        task = await prisma.platformTask.create({
          data: {
            name,
            timing_type: 'POMODORO',
            occupation_time: time
          }
        });
      }
      tasks[name] = task.id;
    }
    console.log(`   ✓ 独立任务: 4个`);
    
    // 3. 创建任务集与任务的关联关系
    console.log('\n3. 创建任务集关联关系...');
    
    // 听课任务集关联
    for (let i = 1; i <= 7; i++) {
      const taskId = tasks[`听课-${i}`];
      await prisma.platformTaskGroupAndTaskRelation.upsert({
        where: {
          platform_task_group_id_platform_task_id: {
            platform_task_group_id: groups['听课'],
            platform_task_id: taskId
          }
        },
        update: {},
        create: {
          platform_task_group_id: groups['听课'],
          platform_task_id: taskId,
          group_sort: i,
          priority: 9999,
          can_divisible: false
        }
      });
    }
    
    // 看直播任务集关联
    for (let i = 1; i <= 10; i++) {
      const taskId = tasks[`看直播-${i}`];
      await prisma.platformTaskGroupAndTaskRelation.upsert({
        where: {
          platform_task_group_id_platform_task_id: {
            platform_task_group_id: groups['看直播'],
            platform_task_id: taskId
          }
        },
        update: {},
        create: {
          platform_task_group_id: groups['看直播'],
          platform_task_id: taskId,
          group_sort: i,
          priority: 9999,
          can_divisible: false
        }
      });
    }
    
    // 看书任务集关联
    for (let i = 1; i <= 7; i++) {
      const taskId = tasks[`看书-${i}`];
      await prisma.platformTaskGroupAndTaskRelation.upsert({
        where: {
          platform_task_group_id_platform_task_id: {
            platform_task_group_id: groups['看书'],
            platform_task_id: taskId
          }
        },
        update: {},
        create: {
          platform_task_group_id: groups['看书'],
          platform_task_id: taskId,
          group_sort: i,
          priority: 9999,
          can_divisible: false
        }
      });
    }
    
    // 做题任务集关联
    for (let i = 1; i <= 10; i++) {
      const taskId = tasks[`做题-${i}`];
      await prisma.platformTaskGroupAndTaskRelation.upsert({
        where: {
          platform_task_group_id_platform_task_id: {
            platform_task_group_id: groups['做题'],
            platform_task_id: taskId
          }
        },
        update: {},
        create: {
          platform_task_group_id: groups['做题'],
          platform_task_id: taskId,
          group_sort: i,
          priority: 9999,
          can_divisible: false
        }
      });
    }
    
    // 作文任务集关联
    for (let i = 8; i <= 10; i++) {
      const taskId = tasks[`作文-${i}`];
      await prisma.platformTaskGroupAndTaskRelation.upsert({
        where: {
          platform_task_group_id_platform_task_id: {
            platform_task_group_id: groups['作文'],
            platform_task_id: taskId
          }
        },
        update: {},
        create: {
          platform_task_group_id: groups['作文'],
          platform_task_id: taskId,
          group_sort: i - 7, // 1, 2, 3
          priority: 9999,
          can_divisible: false
        }
      });
    }
    console.log(`   ✓ 任务集关联关系已创建`);
    
    // 4. 创建计划模板
    console.log('\n4. 创建计划模板...');
    let template = await prisma.planTemplate.findFirst({
      where: { name: '增加测试模版' }
    });
    
    if (!template) {
      template = await prisma.planTemplate.create({
        data: {
          name: '增加测试模版',
          total_days: 10,
          total_time: 5130,
          limit_hour: [570, 570, 570, 570, 570, 570, 570, 390, 390, 360],
          is_enable: true
        }
      });
      console.log(`   ✓ 创建计划模板 (ID: ${template.id})`);
    } else {
      console.log(`   ✓ 使用现有计划模板 (ID: ${template.id})`);
    }
    
    // 5. 创建计划模板详情
    console.log('\n5. 创建计划模板详情...');
    
    // 先删除现有的详情（如果存在）
    await prisma.planTemplateDetail.deleteMany({
      where: { plan_template_id: template.id }
    });
    
    let globalSort = 1;
    
    // Day1-7
    for (let day = 1; day <= 7; day++) {
      const priority = day <= 4 ? 1 : 3; // Day1-4为优先度I，Day5-7为优先度III
      
      await prisma.planTemplateDetail.createMany({
        data: [
          {
            plan_template_id: template.id,
            platform_task_id: tasks[`听课-${day}`],
            platform_task_group_id: groups['听课'],
            priority: priority,
            global_sort: globalSort++,
            group_sort: day,
            day_sort: 1,
            can_divisible: false,
            date_no: day
          },
          {
            plan_template_id: template.id,
            platform_task_id: tasks[`看直播-${day}`],
            platform_task_group_id: groups['看直播'],
            priority: 1,
            global_sort: globalSort++,
            group_sort: day,
            day_sort: 2,
            can_divisible: false,
            date_no: day
          },
          {
            plan_template_id: template.id,
            platform_task_id: tasks[`看书-${day}`],
            platform_task_group_id: groups['看书'],
            priority: 2,
            global_sort: globalSort++,
            group_sort: day,
            day_sort: 3,
            can_divisible: false,
            date_no: day
          },
          {
            plan_template_id: template.id,
            platform_task_id: tasks[`做题-${day}`],
            platform_task_group_id: groups['做题'],
            priority: 2,
            global_sort: globalSort++,
            group_sort: day,
            day_sort: 4,
            can_divisible: false,
            date_no: day
          },
          {
            plan_template_id: template.id,
            platform_task_id: tasks['单词30min'],
            platform_task_group_id: null,
            priority: 9999,
            global_sort: globalSort++,
            group_sort: null,
            day_sort: 5,
            can_divisible: false,
            date_no: day
          }
        ]
      });
    }
    console.log(`   ✓ Day1-7: 35条详情`);
    
    // Day8
    await prisma.planTemplateDetail.createMany({
      data: [
        {
          plan_template_id: template.id,
          platform_task_id: tasks['作文-8'],
          platform_task_group_id: groups['作文'],
          priority: 3,
          global_sort: globalSort++,
          group_sort: 1,
          day_sort: 1,
          can_divisible: false,
          date_no: 8
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['看直播-8'],
          platform_task_group_id: groups['看直播'],
          priority: 1,
          global_sort: globalSort++,
          group_sort: 8,
          day_sort: 2,
          can_divisible: false,
          date_no: 8
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['健身'],
          platform_task_group_id: null,
          priority: 1,
          global_sort: globalSort++,
          group_sort: null,
          day_sort: 3,
          can_divisible: false,
          date_no: 8
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['做题-8'],
          platform_task_group_id: groups['做题'],
          priority: 2,
          global_sort: globalSort++,
          group_sort: 8,
          day_sort: 4,
          can_divisible: false,
          date_no: 8
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['单词30min'],
          platform_task_group_id: null,
          priority: 9999,
          global_sort: globalSort++,
          group_sort: null,
          day_sort: 5,
          can_divisible: false,
          date_no: 8
        }
      ]
    });
    console.log(`   ✓ Day8: 5条详情`);
    
    // Day9
    await prisma.planTemplateDetail.createMany({
      data: [
        {
          plan_template_id: template.id,
          platform_task_id: tasks['作文-9'],
          platform_task_group_id: groups['作文'],
          priority: 3,
          global_sort: globalSort++,
          group_sort: 2,
          day_sort: 1,
          can_divisible: false,
          date_no: 9
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['看直播-9'],
          platform_task_group_id: groups['看直播'],
          priority: 1,
          global_sort: globalSort++,
          group_sort: 9,
          day_sort: 2,
          can_divisible: false,
          date_no: 9
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['跳舞'],
          platform_task_group_id: null,
          priority: 9999,
          global_sort: globalSort++,
          group_sort: null,
          day_sort: 3,
          can_divisible: false,
          date_no: 9
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['做题-9'],
          platform_task_group_id: groups['做题'],
          priority: 2,
          global_sort: globalSort++,
          group_sort: 9,
          day_sort: 4,
          can_divisible: false,
          date_no: 9
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['单词30min'],
          platform_task_group_id: null,
          priority: 9999,
          global_sort: globalSort++,
          group_sort: null,
          day_sort: 5,
          can_divisible: false,
          date_no: 9
        }
      ]
    });
    console.log(`   ✓ Day9: 5条详情`);
    
    // Day10
    await prisma.planTemplateDetail.createMany({
      data: [
        {
          plan_template_id: template.id,
          platform_task_id: tasks['作文-10'],
          platform_task_group_id: groups['作文'],
          priority: 3,
          global_sort: globalSort++,
          group_sort: 3,
          day_sort: 1,
          can_divisible: false,
          date_no: 10
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['看直播-10'],
          platform_task_group_id: groups['看直播'],
          priority: 1,
          global_sort: globalSort++,
          group_sort: 10,
          day_sort: 2,
          can_divisible: false,
          date_no: 10
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['玩耍'],
          platform_task_group_id: null,
          priority: 3,
          global_sort: globalSort++,
          group_sort: null,
          day_sort: 3,
          can_divisible: false,
          date_no: 10
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['做题-10'],
          platform_task_group_id: groups['做题'],
          priority: 2,
          global_sort: globalSort++,
          group_sort: 10,
          day_sort: 4,
          can_divisible: false,
          date_no: 10
        },
        {
          plan_template_id: template.id,
          platform_task_id: tasks['单词30min'],
          platform_task_group_id: null,
          priority: 9999,
          global_sort: globalSort++,
          group_sort: null,
          day_sort: 5,
          can_divisible: false,
          date_no: 10
        }
      ]
    });
    console.log(`   ✓ Day10: 5条详情`);
    
    // 验证
    console.log('\n6. 验证数据...');
    const detailCount = await prisma.planTemplateDetail.count({
      where: { plan_template_id: template.id }
    });
    console.log(`   ✓ 模板详情总数: ${detailCount} 条`);
    
    const dayCount = await prisma.planTemplateDetail.groupBy({
      by: ['date_no'],
      where: { plan_template_id: template.id },
      _count: { id: true }
    });
    console.log(`   ✓ 天数分布:`);
    dayCount.forEach(d => {
      console.log(`      Day${d.date_no}: ${d._count.id} 个任务`);
    });
    
    console.log('\n✅ "增加测试模版"创建完成！');
    
  } catch (error) {
    console.error('❌ 执行出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTemplate();

