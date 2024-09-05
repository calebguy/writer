import { EditorProvider } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

// define your extension array
const extensions = [
  StarterKit
]

const content = '<p>Hello World!</p>'


export function Editor() {
  return (
    <EditorProvider extensions={extensions} content={content}>
      {/* <FloatingMenu editor={null}>This is the floating menu</FloatingMenu> */}
      {/* <BubbleMenu editor={null}>This is the bubble menu</BubbleMenu> */}
    </EditorProvider>
  )
}
