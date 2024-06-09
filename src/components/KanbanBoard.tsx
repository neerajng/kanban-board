import { useEffect, useMemo, useState } from "react";
import { PlusIcon } from "../icons/PlusIcon";
import { Column, Id, Task } from "../types";
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } 
from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import ColumnContainer from "./ColumnContainer";
import { createPortal } from "react-dom";
import { TaskCard } from "./TaskCard";



function KanbanBoard() {
    const [columns, setColumns] = useState<Column[]>(() => {
        const savedColumns = localStorage.getItem('columns');
        return savedColumns ? JSON.parse(savedColumns) : [];
    });
    const [tasks, setTasks]=useState<Task[]>(()=>{
        const savedTasks= localStorage.getItem('tasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });

    const columnsId = useMemo(()=>columns.map((col)=>col.id), [columns])
    const [activeColumn, setActiveColumn]=useState<Column|null>(null);
    const [activeTask, setActiveTask]=useState<Task|null>(null);

     // Update local storage whenever column/task state changes
    useEffect(() => {
        localStorage.setItem('columns', JSON.stringify(columns));
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [columns, tasks]);

    const createNewColumn=()=>{
        const columnToAdd: Column = {
            id: generateId(),
            title: `Column ${columns.length + 1}`,
        };
        setColumns([...columns, columnToAdd]);
        localStorage.setItem('columns', JSON.stringify(columns))
    }

    const generateId=()=> {        
        return Math.floor(Math.random() * 10001);
    }

    const deleteColumn = (id:Id)=>{
        const filteredColumns = columns.filter((col)=>col.id !==id)
        setColumns(filteredColumns)

        const newTasks= tasks.filter((t)=>t.columnId !== id);
        setTasks(newTasks)
    }

    const onDragStart=(event:DragStartEvent)=>{
        if (event.active.data.current?.type === "Column") {
            setActiveColumn(event.active.data.current.column);
            return;
        }
        if (event.active.data.current?.type === "Task") {
            setActiveTask(event.active.data.current.task);
            return;
        }
    }

    const onDragEnd=(event:DragEndEvent)=>{
        setActiveColumn(null);
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeColumnId = active.id;
        const overColumnId = over.id;

        if (activeColumnId ===overColumnId) return;

        setColumns((columns) => {
            const activeColumnIndex = columns.findIndex(
                (col) => col.id === activeColumnId
            );
            const overColumnIndex = columns.findIndex(
                (col) => col.id === overColumnId
            );
            return arrayMove(columns, activeColumnIndex, overColumnIndex);
        });
    }   
    
    const updateColumn=(id: Id, title: string)=> {
        const newColumns = columns.map((col) => {
            if(col.id !== id) return col;
            return { ...col, title };
        });
        setColumns (newColumns);
    }  

    const createTask=(columnId: Id)=> {
        const newTask: Task = {
        id: generateId(),
        columnId,
        content: `Task ${tasks.length + 1}`,
        };
        setTasks([...tasks, newTask]);
    }

    const deleteTask=(id:Id)=>{
        const newTasks=tasks.filter((task)=>task.id !==id)
        setTasks(newTasks)
    }
    const updateTask=(id: Id, content: string)=>{        
        const newTasks = tasks.map((task) => {
        if (task.id !== id) return task;
            return { ...task, content };
        });
        setTasks(newTasks)            
    }

    const onDragOver=(event: DragOverEvent)=> {
        const { active, over } = event;
        if (!over) return;
    
        const activeId = active.id;
        const overId = over.id;
    
        if (activeId === overId) return;
    
        const isActiveATask = active.data.current?.type === "Task";
        const isOverATask = over.data.current?.type === "Task";
    
        if (!isActiveATask) return;
    
        // Im dropping a Task over another Task
        if (isActiveATask && isOverATask) {
          setTasks((tasks) => {
            const activeIndex = tasks.findIndex((t) => t.id === activeId);
            const overIndex = tasks.findIndex((t) => t.id === overId);
    
            if (tasks[activeIndex].columnId != tasks[overIndex].columnId) {
              // Fix introduced after video recording
              tasks[activeIndex].columnId = tasks[overIndex].columnId;
              return arrayMove(tasks, activeIndex, overIndex - 1);
            }
    
            return arrayMove(tasks, activeIndex, overIndex);
          });
        }
    
        const isOverAColumn = over.data.current?.type === "Column";
    
        // Im dropping a Task over a column
        if (isActiveATask && isOverAColumn) {
          setTasks((tasks) => {
            const activeIndex = tasks.findIndex((t) => t.id === activeId);
    
            tasks[activeIndex].columnId = overId;
            console.log("DROPPING TASK OVER COLUMN", { activeIndex });
            return arrayMove(tasks, activeIndex, activeIndex);
          });
        }

      }
    
    
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
        activationConstraint: {
        distance: 3,
        },
     })
    );
    return (
    <>
    <div className="navbar bg-neutral text-neutral-content w-full">
    <button className="btn btn-ghost text-3xl font-mono text-pink-600">Instant KanBan</button>
    </div>    
    <div className="
    m-auto
    flex
    flex-col
    min-h-screen
    w-full
    items-center
    overflow-x-auto
    overflow-y-hidden
    px-[40px]">
        
        <DndContext onDragStart={onDragStart} onDragEnd={onDragEnd} sensors={sensors}
        onDragOver={onDragOver}>
        <div className="m-auto flex gap-4">
            <div className="flex gap-4">
                <SortableContext items={columnsId}>
                {columns.map((col) => (
                    <ColumnContainer key={col.id} column={col} deleteColumn={deleteColumn}
                    updateColumn={updateColumn} createTask={createTask} 
                    tasks={tasks.filter(task=>task.columnId===col.id)}
                    deleteTask={deleteTask} updateTask={updateTask}/>
                ))}
                </SortableContext>
            </div>
            <button
            onClick={createNewColumn}
            className="
            h-[60px]
            w-[350px]
            min-w-[350px]
            cursor-pointer
            rounded-lg
            bg-mainBackgroundColor
            border-2
            border-columnBackgroundColor
            p-4
            ring-rose-500
            hover:ring-2
            flex gap-2
            ">
            <PlusIcon/>    
            Add Column
            </button>
            
        </div>
            {createPortal(
                <DragOverlay>
                    {activeColumn && (
                        <ColumnContainer
                            column={activeColumn}
                            deleteColumn={deleteColumn}
                            updateColumn={updateColumn}
                            createTask={createTask}
                            tasks={tasks.filter(task=>task.columnId===activeColumn.id)}
                            deleteTask={deleteTask}
                            updateTask={updateTask}
                        />
                    )}
                    {activeTask && (
                        <TaskCard task={activeTask}deleteTask={deleteTask} updateTask={updateTask}/>
                    )}
                </DragOverlay>,
                document.body
            )}
            
    </DndContext>
    <footer className="bg-black text-white text-center p-4">
        Made with ❤️ by <a href="mailto:neerajnrjng@gmail.com" className="text-blue-400">neerajnrjng@gmail.com</a>
    </footer>
    </div>
    </>
    );
    }
export default KanbanBoard;