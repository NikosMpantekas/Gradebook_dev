import React, { useState, useEffect } from 'react';
import { 
  ChevronDown,
  Sparkles,
  Bug,
  Code,
  Wrench,
  AlertTriangle,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

// Import ReactMarkdown safely
import ReactMarkdown from 'react-markdown';

const PatchNotesList = ({ patchNotes, user, onEdit, onDelete }) => {
  const [expandedNote, setExpandedNote] = useState(null);

  if (!patchNotes || patchNotes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No patch notes available yet.
        </p>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'release':
        return <Sparkles className="h-4 w-4 text-primary" />;
      case 'bugfix':
        return <Bug className="h-4 w-4 text-warning" />;
      case 'feature':
        return <Code className="h-4 w-4 text-success" />;
      case 'improvement':
        return <Wrench className="h-4 w-4 text-info" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'release':
        return 'bg-primary text-primary-foreground';
      case 'bugfix':
        return 'bg-warning text-warning-foreground';
      case 'feature':
        return 'bg-success text-success-foreground';
      case 'improvement':
        return 'bg-info text-info-foreground';
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'release':
        return 'Release';
      case 'bugfix':
        return 'Bug Fix';
      case 'feature':
        return 'New Feature';
      case 'improvement':
        return 'Improvement';
      case 'critical':
        return 'Critical Update';
      default:
        return type;
    }
  };

  const toggleNote = (noteId) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 mt-4 w-full overflow-hidden">
        {patchNotes.map((note) => (
          <Card key={note._id} className="overflow-hidden border-2 border-gray-600 dark:border-gray-400 w-full">
            <Collapsible open={expandedNote === note._id}>
              <CollapsibleTrigger asChild>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
                  onClick={() => toggleNote(note._id)}
                >
                  {/* Mobile: Show only title and chevron */}
                  <div className="block sm:hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {getTypeIcon(note.type)}
                        <h3 className="font-semibold text-foreground break-words min-w-0 flex-1">
                          {note.title}
                        </h3>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        expandedNote === note._id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                  
                  {/* Desktop: Show full header with all info */}
                  <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      {getTypeIcon(note.type)}
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <div className="flex items-center gap-2 w-full">
                          <h3 className="font-semibold text-foreground break-words min-w-0 flex-1">
                            {note.title}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(note.type)}>
                          {getTypeLabel(note.type)}
                        </Badge>
                        {note.version && (
                          <Badge variant="outline">
                            v{note.version}
                          </Badge>
                        )}
                      </div>
                      
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        expandedNote === note._id ? 'rotate-180' : ''
                      }`} />
                      
                      {user && user.role === 'superadmin' && (
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(note);
                                  }}
                                  className="h-10 w-10 p-0"
                                >
                                  <Edit className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit patch note</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {onDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(note._id);
                                  }}
                                  className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete patch note</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-4">
                    {/* Mobile: Show badges, version, and timestamp when expanded */}
                    <div className="block sm:hidden">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={getTypeColor(note.type)}>
                          {getTypeLabel(note.type)}
                        </Badge>
                        {note.version && (
                          <Badge variant="outline">
                            v{note.version}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </p>
                      
                      {/* Mobile action buttons */}
                      {user && user.role === 'superadmin' && (
                        <div className="flex items-center gap-2 mb-3">
                          {onEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(note);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          )}
                          
                          {onDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(note._id);
                              }}
                              className="flex items-center gap-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {note.content && (
                      <div className="prose prose-sm max-w-none text-muted-foreground break-words">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default PatchNotesList;
