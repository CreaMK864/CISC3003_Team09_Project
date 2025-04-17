"""
OpenAI client module for the Chatbot API.

This module provides a client for interacting with the OpenAI API
to generate responses for the chatbot application using the official OpenAI library.
"""

import os
from typing import AsyncGenerator

from fastapi import HTTPException
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from chatbot_api.config import DEFAULT_MODEL, is_valid_model

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY is None:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


def convert_to_openai_messages(messages: list[dict[str, str]]) -> list[ChatCompletionMessageParam]:
    """
    Convert a list of message dictionaries to OpenAI API format.

    Args:
        messages: list of messages in the conversation

    Returns:
        list of messages in OpenAI API format
    """
    return [{"role": msg["role"], "content": msg["content"]} for msg in messages]


async def stream_chat_completion(
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
) -> AsyncGenerator[str, None]:
    """
    Stream chat completion from OpenAI API.

    Args:
        messages: list of messages in the conversation
        model: OpenAI model to use

    Yields:
        Chunks of the generated response
    """
    openai_messages = convert_to_openai_messages(messages)

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=openai_messages,
            stream=True,
            temperature=0.7,
            max_tokens=1000,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error from OpenAI API: {str(e)}",
        )


async def get_completion(
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
) -> str:
    """
    Get a complete response (non-streaming) from OpenAI API.

    Args:
        messages: list of messages in the conversation
        model: OpenAI model to use

    Returns:
        The complete generated response
    """
    openai_messages = convert_to_openai_messages(messages)

    try:
        completion = await client.chat.completions.create(
            model=model,
            messages=openai_messages,
            stream=False,
            temperature=0.7,
            max_tokens=1000,
        )

        return completion.choices[0].message.content or ""

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error from OpenAI API: {str(e)}",
        )
