# !Сделай теоретическое описание заданий ниже, теорию, которую я должна прочитать. В этот же файл!

# Final Task — Variant B (Calls)

You will receive the full task statement on paper. Use this README only as a short checklist + run instructions.

---

## How to run

From the **root** directory run:

```bash
npm run install:all
```

- This installs all the dependencies

Then still from the **root** directory run:

```bash
npm run start
```

- This will start **mock-api** + **Angular** together.
- Open the app at: `http://localhost:4200`
- You must see the **Calls list page** working without errors.
- You can start.

---

## Rules

- Do your work **ONLY** in: `frontend/`
- **Do not change** anything in: `mock-api/`
- Keep the **starter folder structure** (create new files inside the existing structure).
- Data models are already prepared here:
  - `frontend/src/app/models`

---

## API endpoints

- `GET /calls?page=&limit=&status=&from=&to=`
- `GET /calls/:id/`
- `POST /calls/:id/start`
- `POST /calls/:id/finish`
- `GET /calls/:id/transcript`

---

## What to do (25 points total)

### 1) Date filter + quick range switcher (5 pts)

Add a **To date** filter and quick range buttons **(only one active at a time)**:

- **Today** (00:00–23:59)
- **This week** (Mon 00:00 – Sun 23:59)
- **This month** (1st day 00:00 – last day 23:59)

### 2) Call details page `/calls/:id` (10 pts)

Create a details view with:

- Full call info (`GET /calls/:id`)
- Transcript **if exists** (`GET /calls/:id/transcript`)
- Buttons to:
  - **Start call** (`POST /calls/:id/start`)
  - **Finish call** (`POST /calls/:id/finish`)
    After start/finish:
- Update the call **status** in the details UI
- Status must also update in the **list page**

### 3) Refactor HTTP usage (5 pts)

- Components must **NOT** use `HttpClient` directly.
- Put all API calls into a dedicated service (e.g. `CallsApiService` / `TicketsApiService`).
- Components must work via **RxJS streams** and call service methods.
- Use RxJS so that:
  - One stream loads the **list** based on filters + pagination + search
  - Another stream handles **actions** (start/finish) with proper loading handling

### 4) Keep UI style consistent (5 pts)

- Match the existing app style (layout, paddings, dropdowns, buttons).

---

## Notes

- Make sure your solution compiles and runs with `npm run start` from the root.
- Keep changes consistent with the starter code.

---

## Теоретическое описание решения

### Задача 1: Фильтр дат и быстрые диапазоны (5 баллов)

**Реализованная функциональность:**
- Добавлено поле ввода "To date" для фильтрации по диапазону дат
- Реализованы три кнопки быстрого выбора: "Today", "This Week", "This Month"
- Обеспечена взаимоисключающая активация кнопок (только одна активна)

**Технические решения:**

1. **Reactive Forms**: Использованы `FormControl` для полей `fromCtrl` и `toCtrl`, что обеспечивает реактивное управление состоянием и автоматическую синхронизацию с UI.

2. **RxJS потоки данных**: 
   - `debounceTime(300)` - задержка перед отправкой запроса при ручном вводе (оптимизация количества API запросов)
   - `distinctUntilChanged()` - предотвращение дублирующих запросов при одинаковых значениях
   - `takeUntilDestroyed()` - автоматическая отписка при уничтожении компонента (предотвращение утечек памяти)

3. **Временные зоны (UTC)**: Все даты отображаются в UTC для согласованности между фронтендом и бэкендом. Это решает проблему, когда локальное время пользователя отличается от серверного.

4. **Вычисление диапазонов**:
   - **Today**: От 00:00 до 23:59 текущего дня
   - **This Week**: От понедельника 00:00 до воскресенья 23:59 (ISO 8601 стандарт)
   - **This Month**: От первого дня месяца до последнего дня месяца

**Паттерн Query Parameters**: Состояние фильтров хранится в URL (`?from=...&to=...`), что позволяет:
- Сохранять состояние при перезагрузке страницы
- Делиться ссылками с заданными фильтрами
- Использовать кнопки браузера "назад/вперед"

---

### Задача 2: Страница деталей звонка (10 баллов)

**Реализованная функциональность:**
- Полная информация о звонке (ID, клиент, агент, статус, даты, топик, заметки)
- Просмотр транскрипта для завершенных звонков
- Кнопки "Start" и "Finish" для управления статусом
- Синхронизация статуса со страницей списка

**Технические решения:**

1. **Декларативный подход с RxJS**:
```typescript
call$ = this.route.paramMap.pipe(
  switchMap(params => this.api.getCallById(id)),
  shareReplay({ bufferSize: 1, refCount: true })
);
```
   - `switchMap` - отмена предыдущего запроса при изменении ID
   - `shareReplay` - кеширование результата для множественных подписчиков
   - Паттерн исключает императивное управление подписками

2. **Условная загрузка транскрипта**:
```typescript
transcript$ = this.call$.pipe(
  switchMap(call => {
    if (call.status !== 'completed') return of(null);
    return this.api.getTranscript(call.id);
  })
);
```
   Транскрипт загружается только для завершенных звонков, экономя ресурсы.

3. **BehaviorSubject для синхронизации компонентов**:
```typescript
private callUpdatedSubject = new BehaviorSubject<Call | null>(null);
callUpdated$ = this.callUpdatedSubject.asObservable();
```
   Когда статус звонка меняется на странице деталей, `BehaviorSubject` оповещает страницу списка через `tap` operator, и список автоматически обновляется.

4. **Управление состоянием загрузки**:
   - `actionLoading` флаг показывает спиннер на кнопках во время API запроса
   - `error` хранит сообщения об ошибках
   - `refreshTrigger$` Subject вызывает перезагрузку данных после успешных действий

**Subject триггер для обновления**:
```typescript
private refreshTrigger$ = new Subject<void>();

call$ = merge(
  this.route.paramMap,
  this.refreshTrigger$.pipe(map(() => this.route.snapshot.paramMap))
).pipe(...)
```
После выполнения действия (start/finish), вызов `refreshTrigger$.next()` инициирует перезагрузку данных.

---

### Задача 3: Рефакторинг HTTP (5 баллов)

**Реализованная архитектура:**

1. **Сервисный слой (CallsApiService)**:
   - Единая точка взаимодействия с API
   - Инкапсуляция HTTP логики
   - Типизированные Observable возвращаемые значения

2. **Принцип разделения ответственности**:
   - **Компоненты**: UI логика, отображение, обработка пользовательского ввода
   - **Сервис**: HTTP запросы, бизнес-логика API
   - **Модели**: Типизация данных

3. **Методы сервиса**:
```typescript
// Чтение списка с фильтрами
getCalls(params): Observable<CallsListResponse>

// Чтение одного элемента
getCallById(id): Observable<Call>

// Получение связанных данных
getTranscript(id): Observable<CallTranscript>

// Модифицирующие операции с побочными эффектами
startCall(id): Observable<Call>  // + tap для BehaviorSubject
finishCall(id): Observable<Call> // + tap для BehaviorSubject
```

4. **RxJS паттерны**:
   - **Потоки данных (streams)**: Все операции возвращают Observable
   - **Композиция операторов**: `pipe()` для цепочки преобразований
   - **Побочные эффекты**: `tap()` для обновления состояния без изменения потока
   - **Обработка ошибок**: `catchError()` для graceful degradation

**Преимущества подхода**:
- ✅ Легко тестировать (можно мокировать сервис)
- ✅ Переиспользуемость (сервис доступен всем компонентам)
- ✅ Единообразие (одно место для изменения API логики)
- ✅ Типобезопасность (TypeScript интерфейсы)

---

### Задача 4: Консистентность UI стилей (5 баллов)

**Система дизайна:**

1. **Типографика**:
   - Системные шрифты для быстрой загрузки
   - Заголовки: 22px (страница), 18px (секция)
   - Лейблы: 12px, uppercase, letter-spacing для читаемости

2. **Цветовая схема**:
   - Прозрачные цвета через `rgba()` для слоёв
   - Opacity для muted текста вместо hardcoded серого
   - Согласованная палитра для borders, backgrounds, shadows

3. **Spacing система**:
   - Модулярная сетка: 6px, 12px, 16px, 20px
   - Последовательные значения предотвращают визуальный хаос
   - Одинаковые отступы в похожих элементах

4. **Border-radius стандарты**:
   - 12px - стандартные элементы (кнопки, инпуты)
   - 14px - карточки и контейнеры
   - 999px - pills/badges для полного скругления

5. **Анимации и переходы**:
   - Единый тайминг: `140ms ease`
   - `translateY(-1px)` для эффекта поднятия при hover
   - Плавные тени для depth эффекта

**CSS переменные и паттерны**:
```css
.btn {
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}
```

**Принцип DRY (Don't Repeat Yourself)**:
- Переиспользуемые классы: `.pill`, `.mono`, `.label`, `.muted`
- Консистентные модификаторы: `.btn--primary`, `.btn--range`
- Избегание inline стилей

---

## Общие архитектурные решения

### 1. Реактивное программирование (RxJS)

**Observable streams вместо callbacks/promises**:
- Декларативный стиль кода (описываем "что", а не "как")
- Композиция операторов для сложной логики
- Автоматическое управление подписками через async pipe в шаблонах

**Примеры паттернов**:
```typescript
// Hot Observable с кешированием
shareReplay({ bufferSize: 1, refCount: true })

// Переключение потоков с отменой
switchMap()

// Комбинирование источников
combineLatest([source1$, source2$])

// Слияние потоков
merge(initial$, updates$)
```

### 2. Standalone Components (Angular 21)

- Компоненты не требуют NgModule
- Явные imports в декораторе @Component
- Улучшенная tree-shaking оптимизация
- Упрощенная архитектура

### 3. Signals и Control Flow (@if, @for)

Новый синтаксис Angular 21:
```html
@if (call$ | async; as call) {
  <!-- Содержимое -->
} @else {
  <!-- Loading -->
}

@for (item of items; track item.id) {
  <!-- Итерация -->
}
```

Преимущества:
- Меньше вложенности
- Явный track для производительности
- Читаемость кода

### 4. TypeScript типизация

Строгая типизация всех данных:
```typescript
interface Call {
  id: string;
  status: CallStatus;  // union type: 'scheduled' | 'in_progress' | 'completed'
  scheduledAt: string;
  // ...
}
```

Это предотвращает ошибки на этапе компиляции.

---

## Производительность и оптимизации

1. **debounceTime(300)** - уменьшение количества API запросов при вводе
2. **shareReplay()** - кеширование запросов для множественных подписчиков  
3. **switchMap()** - отмена устаревших запросов при новых
4. **trackBy** в @for - оптимизация рендеринга списков
5. **OnPush** change detection потенциально (не требуется для данного задания)

---

## Заключение

Решение демонстрирует:
- ✅ Современные практики Angular разработки
- ✅ Реактивное программирование с RxJS
- ✅ Separation of Concerns (разделение ответственности)
- ✅ Type-safe код с TypeScript
- ✅ Консистентный UI/UX дизайн
- ✅ Оптимизированная производительность

Архитектура масштабируема и поддерживаема для роста приложения.

