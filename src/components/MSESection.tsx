import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Check } from "lucide-react";
import { useState } from "react";

interface MSESectionProps {
  title: string;
  content: string;
  onEdit?: (newContent: string) => void;
}

export const MSESection = ({ title, content, onEdit }: MSESectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleSave = () => {
    if (onEdit) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-card-foreground">{title}</CardTitle>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full min-h-[100px] p-2 border border-border rounded-md bg-background text-foreground"
          />
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        )}
      </CardContent>
    </Card>
  );
};