/*
   Система действий игры
   Cultist Simulator Zhalkaya Parodia
*/

// Список мест для исследования
const LOCATIONS = [
    { name: 'Полуденный порт', description: 'Место встреч и тайных сделок' },
    { name: 'Киришем', description: 'Забытый город на окраине реальности' },
    { name: 'Лилейные луга', description: 'Покой и забытые воспоминания' },
    { name: 'Миах', description: 'Город вечного заката' },
    { name: 'Багровые леса', description: 'Место древней магии' },
    { name: 'Хрустальные пещеры', description: 'Отражения иных миров' },
    { name: 'Башня Молчания', description: 'Хранилище запретных знаний' },
    { name: 'Река Забвения', description: 'Воды, стирающие память' },
    { name: 'Сад Снов', description: 'Место, где сны становятся реальностью' },
    { name: 'Обитель Зимы', description: 'Вечная мерзлота и холодные истины' }
];

// Начало действия
function startAction(actionType) {
    let message = '';
    let success = true;
    
    switch(actionType) {
        case 'work':
            // Может опустить здоровье до 1
            if (gameState.health > 1) {
                gameState.funds += 2;
                gameState.health -= 1;
                gameState.consecutiveWork = (gameState.consecutiveWork || 0) + 1;
                gameState.workCount = (gameState.workCount || 0) + 1;
                message = 'Вы работаете и зарабатываете немного денег. Здоровье немного ухудшается.';
                
                // Проверяем, не пора ли предложить стать клерком (теперь 9 работ подряд)
                if (gameState.consecutiveWork >= 9 && !gameState.cultCreated) {
                    setTimeout(() => {
                        document.getElementById('career-modal').style.display = 'flex';
                    }, 500);
                }
            } else {
                success = false;
                message = 'Вы слишком истощены для работы.';
                gameState.consecutiveWork = 0; // Сбрасываем счетчик
            }
            break;
            
        case 'study':
            // Посещение книжной лавки стоит 2 денег
            if (gameState.funds >= 2) {
                const locationCard = gameState.cards.find(card => 
                    card.title === 'Книжная лавка' || card.title.includes('Книжная лавка')
                );
                
                if (locationCard) {
                    gameState.funds -= 2;
                    gameState.reason = Math.min(10, gameState.reason + 1);
                    message = 'Вы посещаете книжную лавку. Находите интересные тексты. Рассудок немного восстанавливается.';
                    
                    // Шанс получить аспект
                    if (Math.random() > 0.6) {
                        const knowledgeTypes = Object.keys(KNOWLEDGE_TYPES);
                        const randomType = knowledgeTypes[Math.floor(Math.random() * knowledgeTypes.length)];
                        const knowledge = KNOWLEDGE_TYPES[randomType];
                        
                        createCard(knowledge.name, knowledge.description, cardTypes.ASPECT,
                                  Math.random() * 800 + 100, Math.random() * 400 + 100,
                                  null, randomType);
                        message += ` Вы находите знания об аспекте "${knowledge.name}".`;
                        gameState.hasAspect = true;
                    }
                } else {
                    success = false;
                    message = 'Вы не знаете где находится книжная лавка.';
                }
            } else {
                success = false;
                message = 'У вас недостаточно денег для посещения книжной лавки.';
            }
            break;
            
        case 'dream':
            if (gameState.reason > 0) {
                gameState.reason -= 1;
                message = 'Вы погружаетесь в странные сны. Рассудок слегка страдает.';
                
                if (Math.random() > 0.7) {
                    // Сны могут давать аспекты
                    const knowledgeTypes = Object.keys(KNOWLEDGE_TYPES);
                    const randomType = knowledgeTypes[Math.floor(Math.random() * knowledgeTypes.length)];
                    const knowledge = KNOWLEDGE_TYPES[randomType];
                    
                    createCard(knowledge.name, knowledge.description, cardTypes.ASPECT,
                              Math.random() * 800 + 100, Math.random() * 400 + 100,
                              null, randomType);
                    message += ` Во сне вы постигаете аспект "${knowledge.name}".`;
                    gameState.hasAspect = true;
                }
            } else {
                success = false;
                message = 'Вы слишком близки к безумию, чтобы спать.';
            }
            break;
            
        case 'talk':
            message = 'Вы ищете последователей для своего будущего культа.';
            
            if (Math.random() > 0.5) {
                // Если культ создан, сразу создаем верных последователей
                if (gameState.cultCreated) {
                    createCard('Верный последователь', `Преданный член вашего культа`, cardTypes.FOLLOWER, 
                              Math.random() * 800 + 100, Math.random() * 400 + 100);
                    message += ' Вы находите верного последователя для своего культа.';
                } else {
                    createCard('Потенциальный последователь', 'Может заинтересоваться вашими идеями', cardTypes.FOLLOWER, 
                              Math.random() * 800 + 100, Math.random() * 400 + 100);
                    message += ' Вы находите потенциального последователя.';
                }
            } else {
                message += ' Никто не проявил интереса к вашим идеям.';
            }
            break;
            
        case 'explore-world':
            // Исследование мира стоит 3 денег
            if (gameState.funds >= 3) {
                gameState.funds -= 3;
                message = 'Вы исследуете мир в поисках интересных места.';
                
                // Скрываем модальное окно исследования
                hideExploreModal();
                
                if (Math.random() > 0.5) {
                    // Находим случайное место
                    const randomLocation = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
                    createCard(randomLocation.name, randomLocation.description, cardTypes.LOCATION, 
                              Math.random() * 800 + 100, Math.random() * 400 + 100);
                    message += ` Вы обнаруживаете "${randomLocation.name}".`;
                    
                    // Шанс найти аспект при исследовании особых мест
                    if (Math.random() > 0.8) {
                        const knowledgeTypes = Object.keys(KNOWLEDGE_TYPES);
                        const randomType = knowledgeTypes[Math.floor(Math.random() * knowledgeTypes.length)];
                        const knowledge = KNOWLEDGE_TYPES[randomType];
                        
                        createCard(knowledge.name, knowledge.description, cardTypes.ASPECT,
                                  Math.random() * 800 + 100, Math.random() * 400 + 100,
                                  null, randomType);
                        message += ` Здесь вы находите следы аспекта "${knowledge.name}".`;
                        gameState.hasAspect = true;
                    }
                } else {
                    message += ' Вы ничего интересного не нашли.';
                }
            } else {
                success = false;
                message = 'У вас недостаточно денег для исследования мира (нужно 3💰).';
                // Скрываем модальное окно даже при неудаче
                hideExploreModal();
            }
            break;
            
        case 'ritual':
            // Проверяем условия для ритуалов
            if (!gameState.cultCreated) {
                success = false;
                message = 'Вы должны сначала создать культ, чтобы проводить ритуалы.';
            } else {
                const ritualResult = performRitual();
                if (ritualResult) {
                    message = ritualResult.message;
                    gameState.ritualCount += 1;
                    if (ritualResult.ending) {
                        showEnding(ritualResult.ending);
                        return;
                    }
                } else {
                    // Ритуал может опустить здоровье до 1, но не до 0
                    if (gameState.health > 1 && gameState.reason > 1) {
                        gameState.health -= 1;
                        gameState.reason -= 1;
                        gameState.ritualCount += 1;
                        message = 'Вы проводите таинственный ритуал.';
                        
                        // Ритуал теперь не привлекает последователей
                        // Вместо этого может дать аспект
                        if (Math.random() > 0.7 && gameState.cultAspect) {
                            const knowledge = KNOWLEDGE_TYPES[gameState.cultAspect];
                            createCard(knowledge.name, knowledge.description, cardTypes.ASPECT,
                                      Math.random() * 800 + 100, Math.random() * 400 + 100,
                                      null, gameState.cultAspect);
                            message += ` Ритуал открыл вам новые глубины аспекта "${knowledge.name}".`;
                        } else {
                            message += ' Ритуал не принес ожидаемых результатов.';
                        }
                    } else {
                        success = false;
                        message = 'У вас недостаточно здоровья или рассудка для проведения ритуала.';
                    }
                }
            }
            break;
            
        case 'rest':
            if (gameState.funds > 0) {
                gameState.funds -= 1;
                gameState.health = Math.min(10, gameState.health + 2);
                gameState.reason = Math.min(10, gameState.reason + 1);
                gameState.consecutiveWork = 0; // Сбрасываем счетчик работ при отдыхе
                message = 'Вы отдыхаете и восстанавливаете силы.';
            } else {
                success = false;
                message = 'У вас недостаточно денег для отдыха.';
            }
            break;
    }
    
    if (success) {
        addLogEntry(message);
    } else {
        addLogEntry(`Неудача: ${message}`);
    }
    
    updateUI();
    
    // Проверяем, можно ли создать культ после действия
    checkCultCreation();
}

// Проверка возможности создания культа
function checkCultCreation() {
    // Для создания культа нужен хотя бы один аспект
    const hasAspect = gameState.cards.some(card => card.type === cardTypes.ASPECT);
    
    if (hasAspect && !gameState.cultCreated) {
        document.getElementById('action-create-cult').style.display = 'block';
        gameState.hasAspect = true;
    } else {
        document.getElementById('action-create-cult').style.display = 'none';
    }
    
    // Показываем кнопку ритуала только после создания культа
    if (gameState.cultCreated) {
        document.getElementById('action-ritual').style.display = 'block';
    } else {
        document.getElementById('action-ritual').style.display = 'none';
    }
    
    // Обновляем счетчик последовательных работ на кнопке "Работать"
    const workAction = document.getElementById('action-work');
    if (gameState.consecutiveWork > 0) {
        let counter = workAction.querySelector('.action-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'action-counter';
            workAction.appendChild(counter);
        }
        counter.textContent = gameState.consecutiveWork;
    } else {
        const counter = workAction.querySelector('.action-counter');
        if (counter) {
            counter.remove();
        }
    }
    
    // Отключаем кнопку исследования если нет денег
    const exploreAction = document.getElementById('action-explore');
    if (gameState.funds < 3) {
        exploreAction.classList.add('disabled');
        exploreAction.title = "Недостаточно денег (нужно 3💰)";
        // Удаляем обработчик клика, чтобы кнопка не работала
        exploreAction.onclick = null;
        exploreAction.addEventListener('click', function(e) {
            e.preventDefault();
            addLogEntry('Недостаточно денег для исследования (нужно 3💰).');
        });
    } else {
        exploreAction.classList.remove('disabled');
        exploreAction.title = "Исследовать мир или известные места";
        // Восстанавливаем обработчик
        exploreAction.onclick = showExploreModal;
    }
    
    // Отключаем кнопку изучения если нет денег
    const studyAction = document.getElementById('action-study');
    if (gameState.funds < 2) {
        studyAction.classList.add('disabled');
        studyAction.title = "Недостаточно денег (нужно 2💰)";
    } else {
        studyAction.classList.remove('disabled');
        studyAction.title = "Посетить книжную лавку";
    }
    
    // Отключаем кнопку ритуала если нет здоровья или рассудка
    const ritualAction = document.getElementById('action-ritual');
    if (ritualAction.style.display !== 'none') {
        if (gameState.health <= 1 || gameState.reason <= 1) {
            ritualAction.classList.add('disabled');
            ritualAction.title = "Недостаточно здоровья или рассудка";
        } else {
            ritualAction.classList.remove('disabled');
            ritualAction.title = "Провести ритуал";
        }
    }
    
    // Отключаем кнопку отдыха если нет денег
    const restAction = document.getElementById('action-rest');
    if (gameState.funds < 1) {
        restAction.classList.add('disabled');
        restAction.title = "Недостаточно денег (нужно 1💰)";
    } else {
        restAction.classList.remove('disabled');
        restAction.title = "Отдохнуть и восстановить силы";
    }
}

// Добавление записи в журнал
function addLogEntry(entry) {
    gameState.logEntries.push(entry);
    if (gameState.logEntries.length > 20) {
        gameState.logEntries.shift();
    }
}

// Получение описания карты для панели описания
function getCardDescription(card) {
    if (!card) return '';
    
    let description = '';
    
    if (card.type === cardTypes.ASPECT && card.knowledgeType) {
        const knowledge = KNOWLEDGE_TYPES[card.knowledgeType];
        description = `<span class="${card.knowledgeType.toLowerCase()}">${knowledge.description}</span>`;
        
        // Добавляем дополнительную информацию если это аспект культа
        if (gameState.cultAspect === card.knowledgeType) {
            description += `<br><br><span class="cult-info">Это аспект вашего культа. Соберите 3 таких карты для вознесения.</span>`;
        }
    } 
    else if (card.type === cardTypes.LOCATION) {
        if (card.title === 'Книжная лавка') {
            description = 'Место для поиска знаний и изучения аспектов.';
            description += `<br><br><span class="explore-info">Для посещения используйте действие "Посетить книжную лавку".</span>`;
        } else {
            description = card.description || 'Таинственное место, полное секретов.';
            description += `<br><br><span class="explore-info">Исследование этого места обойдется в 3💰 и уничтожит карту.</span>`;
        }
    }
    else if (card.type === cardTypes.FOLLOWER) {
        if (card.title.includes('Верный')) {
            description = 'Преданный последователь вашего культа. Готов следовать за вами в самые темные уголки реальности.';
            description += `<br><br><span class="cult-info">5 верных последователей приведут к концовке Лидера Культа.</span>`;
        } else {
            description = 'Потенциальный последователь. Проявит истинную преданность только после создания культа.';
        }
    }
    else if (card.type === cardTypes.CULT) {
        const aspectName = card.title.replace('Культ ', '');
        description = `Ваша организация, поклоняющаяся аспекту <span class="${gameState.cultAspect?.toLowerCase() || ''}">${aspectName}</span>. Здесь проводятся ритуалы и собираются верные последователи.`;
        description += `<br><br><span class="cult-info">Проводите ритуалы, чтобы достичь просветления через этот аспект.</span>`;
    }
    else if (card.type === cardTypes.RESOURCE) {
        if (card.title === 'Здоровье') {
            description = 'Ваша жизненная сила. Слишком низкое здоровье может привести к печальным последствиям.';
            description += `<br><br><span class="resource-info">Отдых восстанавливает здоровье. Работа и ритуалы истощают его.</span>`;
        } else if (card.title === 'Рассудок') {
            description = 'Ваша ментальная стабильность. Изучение оккультных знаний истощает рассудок.';
            description += `<br><br><span class="resource-info">Сны истощают рассудок. Посещение книжной лавки восстанавливает его.</span>`;
        } else if (card.title === 'Деньги') {
            description = 'Средства к существованию. Требуются для исследований, отдыха и посещения книжной лавки.';
            description += `<br><br><span class="resource-info">Работа приносит 2💰. Исследование мира стоит 3💰.</span>`;
        }
    }
    
    return description || 'Эта карта не имеет описания.';
}