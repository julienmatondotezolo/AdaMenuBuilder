import { MenuProvider } from "./context/MenuContext";
import Header from "./components/Header";
import EditorPanel from "./components/Editor/EditorPanel";
import PreviewPanel from "./components/Preview/PreviewPanel";
import AIPromptBar from "./components/AIPromptBar";

function App() {
  return (
    <MenuProvider>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden">
          <div className="w-[440px] shrink-0 border-r border-gray-200 bg-white">
            <EditorPanel />
          </div>

          <div className="flex-1 min-w-0 relative">
            <PreviewPanel />
          </div>
        </main>

        <AIPromptBar />
      </div>
    </MenuProvider>
  );
}

export default App;
