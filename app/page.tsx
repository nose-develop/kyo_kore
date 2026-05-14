"use client";

import { FormEvent, useMemo, useState } from "react";

type Mode = "single" | "shuffle" | "weighted";

type Task = {
  id: string;
  title: string;
  priority?: number;
};

type Result =
  | {
      mode: "single" | "weighted";
      task: Task;
      message: string;
    }
  | {
      mode: "shuffle";
      tasks: Task[];
      message: string;
    };

const modes: {
  id: Mode;
  label: string;
  title: string;
  description: string;
}[] = [
  {
    id: "single",
    label: "今日これだけ決める",
    title: "今日これだけモード",
    description: "迷う時間を止めるため、1つだけ選びます。",
  },
  {
    id: "shuffle",
    label: "適当に優先順位をつける",
    title: "適当優先順位モード",
    description: "全部をほどよく混ぜて、今日の順番を作ります。",
  },
  {
    id: "weighted",
    label: "重要度を考慮して決める",
    title: "重要度バイアス抽選モード",
    description: "重要度が高いものほど選ばれやすくします。",
  },
];

const encouragements = [
  "今日はこれだけできれば勝ちです。",
  "まずは5分だけ始めましょう。",
  "完璧じゃなくてOKです。",
  "迷う時間を行動に変えましょう。",
  "終わったら自分を褒めてください。",
];

const drawingMessages = [
  "考え中...",
  "今日の運命を決定中...",
  "迷いを断ち切っています...",
];

function pickRandomTask(tasks: Task[]) {
  return tasks[Math.floor(Math.random() * tasks.length)];
}

function shuffleTasks(tasks: Task[]) {
  const copied = [...tasks];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }

  return copied;
}

function pickWeightedTask(tasks: Task[]) {
  const totalWeight = tasks.reduce(
    (sum, task) => sum + Number(task.priority ?? 0),
    0,
  );
  const randomWeight = Math.random() * totalWeight;
  let accumulatedWeight = 0;

  for (const task of tasks) {
    accumulatedWeight += Number(task.priority ?? 0);
    if (randomWeight < accumulatedWeight) {
      return task;
    }
  }

  return tasks[tasks.length - 1];
}

function pickEncouragement() {
  return encouragements[Math.floor(Math.random() * encouragements.length)];
}

function pickDrawingMessage() {
  return drawingMessages[Math.floor(Math.random() * drawingMessages.length)];
}

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("single");
  const [taskTitle, setTaskTitle] = useState("");
  const [priority, setPriority] = useState("5");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMessage, setDrawingMessage] = useState(drawingMessages[0]);
  const [rerollCount, setRerollCount] = useState(0);

  const selectedMode = useMemo(
    () => modes.find((item) => item.id === mode) ?? modes[0],
    [mode],
  );

  const actionLabel =
    mode === "single"
      ? "今日やることを決める"
      : mode === "shuffle"
        ? "優先順位を作る"
        : "重要度で抽選する";

  const hasTasks = tasks.length > 0;

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    setErrorMessage("");
    setResult(null);
    setRerollCount(0);

    if (nextMode === "weighted") {
      setTasks((currentTasks) =>
        currentTasks.map((task) => ({
          ...task,
          priority: task.priority ?? 5,
        })),
      );
    }
  }

  function validatePriority(value: string) {
    if (value.trim() === "") {
      return "重要度を1〜10で入力してください。";
    }

    const numericPriority = Number(value);

    if (
      !Number.isInteger(numericPriority) ||
      numericPriority < 1 ||
      numericPriority > 10
    ) {
      return "重要度は1〜10で入力してください。";
    }

    return "";
  }

  function handleAddTask(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedTitle = taskTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage("タスク名を入力してください。");
      return;
    }

    if (mode === "weighted") {
      const priorityError = validatePriority(priority);

      if (priorityError) {
        setErrorMessage(priorityError);
        return;
      }
    }

    const numericPriority = Number(priority);

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: createTaskId(),
        title: trimmedTitle,
        priority: mode === "weighted" ? numericPriority : undefined,
      },
    ]);
    setTaskTitle("");
    setPriority("5");
    setErrorMessage("");
    setResult(null);
    setRerollCount(0);
  }

  function handleDeleteTask(taskId: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setResult(null);
  }

  function handleUpdateTaskPriority(taskId: string, nextPriority: number) {
    const normalizedPriority = Math.min(10, Math.max(1, nextPriority));

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              priority: normalizedPriority,
            }
          : task,
      ),
    );
    setResult(null);
    setErrorMessage("");
    setRerollCount(0);
  }

  function validateRun() {
    if (tasks.length === 0) {
      return "まずは今日やることを入力してください。";
    }

    if (tasks.length === 1) {
      return "2つ以上入力すると、優先度を決められます。";
    }

    if (mode === "weighted") {
      const hasInvalidPriority = tasks.some(
        (task) =>
          !Number.isInteger(task.priority) ||
          Number(task.priority) < 1 ||
          Number(task.priority) > 10,
      );

      if (hasInvalidPriority) {
        return "重要度は1〜10で入力してください。";
      }
    }

    return "";
  }

  function createResult(): Result {
    const message = pickEncouragement();

    if (mode === "shuffle") {
      return {
        mode,
        tasks: shuffleTasks(tasks),
        message,
      };
    }

    if (mode === "weighted") {
      return {
        mode,
        task: pickWeightedTask(tasks),
        message,
      };
    }

    return {
      mode,
      task: pickRandomTask(tasks),
      message,
    };
  }

  function handleRun() {
    const validationMessage = validateRun();

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage("");
    setIsDrawing(true);
    setDrawingMessage(pickDrawingMessage());

    window.setTimeout(() => {
      setResult(createResult());
      setRerollCount((currentCount) => currentCount + 1);
      setIsDrawing(false);
    }, 1000);
  }

  function handleResetInput() {
    setResult(null);
    setErrorMessage("");
    setRerollCount(0);
  }

  return (
    <main className="min-h-screen bg-[#f8f4eb] text-[#24211d]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="pt-4 text-center sm:pt-8">
          <p className="text-sm font-bold tracking-[0.18em] text-[#c3523b]">
            JUST ONE THING TODAY
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
            今日これだけメーカー
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#625c52] sm:text-lg">
            <span className="block">
              今日やることが多すぎる日に、まず1つだけ決めます。
            </span>
            <span className="block">
              ちゃんと優先順位を決めなくても大丈夫。
            </span>
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="モード選択">
          {modes.map((item) => {
            const isSelected = item.id === mode;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleModeChange(item.id)}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  isSelected
                    ? "border-[#24211d] bg-[#fff7db] shadow-[0_8px_0_#24211d]"
                    : "border-[#ded3bd] bg-white hover:border-[#24211d]"
                }`}
              >
                <span className="text-sm font-bold text-[#c3523b]">
                  {item.title}
                </span>
                <span className="mt-2 block text-lg font-black">
                  {item.label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[#625c52]">
                  {item.description}
                </span>
              </button>
            );
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-3xl border-2 border-[#24211d] bg-white p-5 shadow-[0_10px_0_#24211d] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#c3523b]">
                  {selectedMode.title}
                </p>
                <h2 className="text-2xl font-black">今日やること</h2>
              </div>
              <p className="text-sm text-[#625c52]">{tasks.length}件入力中</p>
            </div>

            <form
              onSubmit={handleAddTask}
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <label className="flex flex-col gap-2 text-sm font-bold">
                タスク名
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="例: 英語を30分勉強する"
                  className="min-h-12 rounded-xl border-2 border-[#ded3bd] bg-[#fffdf7] px-4 text-base font-medium outline-none transition focus:border-[#24211d]"
                />
              </label>

              {mode === "weighted" ? (
                <label className="flex flex-col gap-2 text-sm font-bold sm:w-28">
                  重要度
                  <input
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    type="number"
                    min="1"
                    max="10"
                    inputMode="numeric"
                    className="min-h-12 rounded-xl border-2 border-[#ded3bd] bg-[#fffdf7] px-4 text-base font-medium outline-none transition focus:border-[#24211d]"
                  />
                </label>
              ) : null}

              <button
                type="submit"
                className="min-h-12 self-end rounded-xl border-2 border-[#24211d] bg-[#6fbf73] px-5 font-black text-white shadow-[0_4px_0_#24211d] transition hover:translate-y-0.5 hover:shadow-[0_2px_0_#24211d]"
              >
                追加
              </button>
            </form>

            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-[#efb8a8] bg-[#fff0ea] px-4 py-3 text-sm font-bold text-[#b03324]">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-5">
              {hasTasks ? (
                <ul className="grid gap-3">
                  {tasks.map((task, index) => (
                    <li
                      key={task.id}
                      className={`gap-3 rounded-2xl border border-[#eadfcb] bg-[#fffdf7] p-3 ${
                        mode === "weighted"
                          ? "grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                          : "grid grid-cols-[minmax(0,1fr)_auto] items-center"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#24211d] text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 break-words font-bold">
                          {task.title}
                        </span>
                      </div>
                      {mode === "weighted" ? (
                        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#fff4c7] p-2 sm:justify-center">
                          <span className="text-sm font-black text-[#6b4b00]">
                            重要度
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskPriority(
                                  task.id,
                                  Number(task.priority ?? 5) - 1,
                                )
                              }
                              aria-label={`${task.title}の重要度を下げる`}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#24211d] bg-white text-lg font-black shadow-[0_2px_0_#24211d] transition hover:translate-y-0.5 hover:shadow-none"
                            >
                              -
                            </button>
                            <input
                              value={task.priority ?? 5}
                              onChange={(event) => {
                                const nextPriority = Number(
                                  event.target.value,
                                );

                                if (Number.isInteger(nextPriority)) {
                                  handleUpdateTaskPriority(
                                    task.id,
                                    nextPriority,
                                  );
                                }
                              }}
                              type="number"
                              min="1"
                              max="10"
                              inputMode="numeric"
                              aria-label={`${task.title}の重要度`}
                              className="h-9 w-16 rounded-xl border-2 border-[#ded3bd] bg-white text-center text-base font-black outline-none transition focus:border-[#24211d]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTaskPriority(
                                  task.id,
                                  Number(task.priority ?? 5) + 1,
                                )
                              }
                              aria-label={`${task.title}の重要度を上げる`}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#24211d] bg-white text-lg font-black shadow-[0_2px_0_#24211d] transition hover:translate-y-0.5 hover:shadow-none"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label={`${task.title}を削除`}
                        className="min-h-10 justify-self-end rounded-xl border border-[#ded3bd] px-3 text-sm font-bold text-[#625c52] transition hover:border-[#b03324] hover:text-[#b03324]"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#cfc0a6] bg-[#fffdf7] px-4 py-8 text-center text-[#625c52]">
                  まずは今日やることを入力してください。
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={isDrawing}
              className="mt-5 min-h-14 w-full rounded-2xl border-2 border-[#24211d] bg-[#ffce45] px-5 text-lg font-black shadow-[0_6px_0_#24211d] transition hover:translate-y-0.5 hover:shadow-[0_3px_0_#24211d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDrawing ? drawingMessage : actionLabel}
            </button>
          </section>

          <section className="rounded-3xl border-2 border-[#24211d] bg-[#fff7db] p-5 shadow-[0_10px_0_#24211d] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#c3523b]">RESULT</p>
                <h2 className="text-2xl font-black">結果</h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#c3523b]">
                今日これだけ！
              </span>
            </div>

            <div className="mt-5">
              {isDrawing ? (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl bg-white px-5 text-center">
                  <div className="mb-5 h-16 w-16 animate-spin rounded-full border-8 border-[#ffe197] border-t-[#c3523b]" />
                  <p className="text-2xl font-black">{drawingMessage}</p>
                </div>
              ) : result ? (
                <ResultView
                  result={result}
                  mode={mode}
                  rerollCount={rerollCount}
                  onReroll={handleRun}
                  onReset={handleResetInput}
                />
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl bg-white px-5 text-center">
                  <p className="text-5xl font-black text-[#ffce45]">?</p>
                  <p className="mt-4 text-xl font-black">
                    タスクを2つ以上入れると決められます。
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#625c52]">
                    <span className="block">迷っていても大丈夫。</span>
                    <span className="block">
                      ボタンを押したら、今日の一歩をここに出します。
                    </span>
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ResultView({
  result,
  mode,
  rerollCount,
  onReroll,
  onReset,
}: {
  result: Result;
  mode: Mode;
  rerollCount: number;
  onReroll: () => void;
  onReset: () => void;
}) {
  if (result.mode === "shuffle") {
    return (
      <div className="rounded-3xl bg-white p-5">
        <p className="text-center text-lg font-black">今日のおすすめ順番</p>
        <ol className="mt-5 grid gap-3">
          {result.tasks.map((task, index) => (
            <li
              key={task.id}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                index === 0
                  ? "border-[#c3523b] bg-[#fff0ea]"
                  : "border-[#eadfcb] bg-[#fffdf7]"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#24211d] font-black text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 break-words text-lg font-black">
                {task.title}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-center font-bold text-[#625c52]">
          {result.message}
        </p>
        <ResultActions mode={mode} onReroll={onReroll} onReset={onReset} />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5 text-center">
      <p className="text-lg font-black">
        {result.mode === "weighted"
          ? "重要度を考慮した結果、今日はこれをやりましょう。"
          : "今日これだけはやってください。"}
      </p>
      <div className="my-6 rounded-3xl border-2 border-[#24211d] bg-[#ffce45] px-4 py-8 shadow-[0_6px_0_#24211d]">
        <p className="break-words text-3xl font-black leading-tight sm:text-4xl">
          {result.task.title}
        </p>
      </div>
      <p className="font-bold text-[#625c52]">
        {result.mode === "weighted" ? (
          "重要度を重みとして抽選した結果、このタスクが選ばれました。"
        ) : (
          <>
            <span className="block">他はできなくてもOKです。</span>
            <span className="block">まずはこれだけやりましょう。</span>
          </>
        )}
      </p>
      <p className="mt-3 font-black text-[#c3523b]">{result.message}</p>
      {rerollCount > 1 ? (
        <p className="mt-4 rounded-2xl bg-[#fff7db] px-4 py-3 text-sm font-bold text-[#6b4b00]">
          <span className="block">
            選び直してもOKですが、迷いすぎ注意です。
          </span>
          <span className="block">3回以内に決めましょう。</span>
        </p>
      ) : null}
      <ResultActions mode={mode} onReroll={onReroll} onReset={onReset} />
    </div>
  );
}

function ResultActions({
  mode,
  onReroll,
  onReset,
}: {
  mode: Mode;
  onReroll: () => void;
  onReset: () => void;
}) {
  const [isCommitted, setIsCommitted] = useState(false);

  return (
    <div className="mt-6 grid gap-3">
      <button
        type="button"
        onClick={onReroll}
        className="min-h-12 rounded-xl border-2 border-[#24211d] bg-[#6fbf73] px-5 font-black text-white shadow-[0_4px_0_#24211d] transition hover:translate-y-0.5 hover:shadow-[0_2px_0_#24211d]"
      >
        {mode === "shuffle" ? "もう一度作る" : "もう一度決める"}
      </button>
      <button
        type="button"
        onClick={() => setIsCommitted(true)}
        className="min-h-12 rounded-xl border-2 border-[#24211d] bg-[#c3523b] px-5 font-black text-white shadow-[0_4px_0_#24211d] transition hover:translate-y-0.5 hover:shadow-[0_2px_0_#24211d]"
      >
        {isCommitted
          ? "よし、始めましょう"
          : mode === "shuffle"
            ? "この順番でやる"
            : "このタスクをやる"}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="min-h-12 rounded-xl border-2 border-[#ded3bd] bg-white px-5 font-black text-[#625c52] transition hover:border-[#24211d] hover:text-[#24211d]"
      >
        タスクを入力し直す
      </button>
    </div>
  );
}
