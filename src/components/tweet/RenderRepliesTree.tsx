
import Reply from './Reply';

interface RenderRepliesTreeProps {
  replies: any[];
  depth?: number;
}

const RenderRepliesTree = ({ replies, depth = 0 }: RenderRepliesTreeProps) => {
  if (!replies || replies.length === 0) {
    return null;
  }
  
  return (
    <div>
      {replies.map((reply) => (
        <div 
          key={reply.id} 
          className="pl-4 border-l border-gray-700" 
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <Reply reply={reply} />
          {reply.children && reply.children.length > 0 && (
            <RenderRepliesTree replies={reply.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
};

export default RenderRepliesTree;
