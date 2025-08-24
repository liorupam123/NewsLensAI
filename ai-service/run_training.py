import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
import numpy as np
from sklearn.metrics import accuracy_score, f1_score

def compute_metrics(pred):
    """A function to compute accuracy and F1 score for evaluation."""
    labels = pred.label_ids
    preds = np.argmax(pred.predictions, axis=1)
    f1 = f1_score(labels, preds, average="weighted")
    acc = accuracy_score(labels, preds)
    return {"accuracy": acc, "f1": f1}

def train_and_evaluate():
    # --- 1. Configuration ---
    model_name = "distilbert-base-uncased"
    dataset_name = "SetFit/ag_news"
    new_model_path = "./models/bert-finetuned-agnews"

    # --- 2. Load Dataset ---
    print("Loading the full AG News dataset...")
    dataset = load_dataset(dataset_name)
    train_dataset = dataset["train"]
    test_dataset = dataset["test"]
    print(f"Training on {len(train_dataset)} samples. Testing on {len(test_dataset)} samples.")

    # --- 3. Tokenization ---
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True)

    print("\nTokenizing datasets...")
    tokenized_train_dataset = train_dataset.map(tokenize_function, batched=True)
    tokenized_test_dataset = test_dataset.map(tokenize_function, batched=True)
    print("Tokenization complete.")

    # --- 4. Load Model ---
    # We load the model with 4 labels for our 4 news categories.
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=4)

    # --- 5. Training Arguments ---
    # These are the recommended starting parameters.
    training_args = TrainingArguments(
        output_dir=new_model_path,
        num_train_epochs=2,
        learning_rate=2e-5,
        per_device_train_batch_size=16, # Lower to 8 or 4 if you get memory errors
        per_device_eval_batch_size=16,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        fp16=False, # Set to False for GTX 1080 Ti. Set to True for newer NVIDIA GPUs.
        logging_steps=500,
    )

    # --- 6. Initialize Trainer ---
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train_dataset,
        eval_dataset=tokenized_test_dataset, # The test set is used for evaluation during training
        compute_metrics=compute_metrics,
        tokenizer=tokenizer,
    )

    # --- 7. Train Model ---
    print("\nStarting model training...")
    trainer.train()
    print("Training complete.")

    # --- 8. Test Model ---
    # After training, run a final evaluation on the test set.
    print("\n--- Final Evaluation on Test Set ---")
    eval_results = trainer.evaluate(eval_dataset=tokenized_test_dataset)
    
    # Print the results in a clean format
    for key, value in eval_results.items():
        print(f"{key}: {value:.4f}")

    # --- 9. Save Final Model ---
    print(f"\nSaving the best model to {new_model_path}...")
    trainer.save_model(new_model_path)
    tokenizer.save_pretrained(new_model_path)
    print("Process complete.")

if __name__ == "__main__":
    train_and_evaluate()