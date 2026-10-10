"""
AWS services integration for S3, SNS, and IoT Core.
"""
try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    boto3 = None
    ClientError = Exception
    NoCredentialsError = Exception
from typing import Dict, Optional, Any
import logging
import json
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class AWSService:
    """Service for AWS S3, SNS, and IoT Core operations."""
    
    def __init__(self):
        self.region = settings.AWS_REGION
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        
        # Initialize clients only if credentials are available
        self._s3_client = None
        self._sns_client = None
        self._iot_client = None
        
    def _get_s3_client(self):
        """Get or create S3 client."""
        if self._s3_client is None and self.access_key and self.secret_key:
            try:
                self._s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
            except Exception as e:
                logger.error(f"Failed to create S3 client: {e}")
        return self._s3_client
    
    def _get_sns_client(self):
        """Get or create SNS client."""
        if self._sns_client is None and self.access_key and self.secret_key:
            try:
                self._sns_client = boto3.client(
                    'sns',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
            except Exception as e:
                logger.error(f"Failed to create SNS client: {e}")
        return self._sns_client
    
    def _get_iot_client(self):
        """Get or create IoT Data client."""
        if self._iot_client is None and self.access_key and self.secret_key:
            try:
                self._iot_client = boto3.client(
                    'iot-data',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region
                )
            except Exception as e:
                logger.error(f"Failed to create IoT client: {e}")
        return self._iot_client
    
    async def upload_to_s3(
        self,
        file_content: bytes,
        key: str,
        bucket: Optional[str] = None,
        content_type: str = "application/octet-stream",
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload file to S3 bucket.
        
        Args:
            file_content: File content as bytes
            key: S3 object key (path)
            bucket: S3 bucket name (uses default if None)
            content_type: MIME type of the file
            metadata: Optional metadata dictionary
            
        Returns:
            Dictionary with upload result
        """
        bucket = bucket or settings.S3_BUCKET_NAME
        
        if not bucket:
            logger.warning("S3 bucket not configured")
            return self._mock_s3_upload(key)
        
        client = self._get_s3_client()
        if not client:
            logger.warning("S3 client not available, returning mock response")
            return self._mock_s3_upload(key)
        
        try:
            extra_args = {
                'ContentType': content_type
            }
            if metadata:
                extra_args['Metadata'] = metadata
            
            client.put_object(
                Bucket=bucket,
                Key=key,
                Body=file_content,
                **extra_args
            )
            
            # Generate URL (note: this is not signed, for public access)
            url = f"https://{bucket}.s3.{self.region}.amazonaws.com/{key}"
            
            return {
                "success": True,
                "bucket": bucket,
                "key": key,
                "url": url,
                "size": len(file_content)
            }
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        except NoCredentialsError:
            logger.error("AWS credentials not available")
            return self._mock_s3_upload(key)
    
    async def send_sns_notification(
        self,
        message: str,
        subject: Optional[str] = None,
        topic_arn: Optional[str] = None,
        message_attributes: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send notification via AWS SNS.
        
        Args:
            message: Message content
            subject: Message subject (for email)
            topic_arn: SNS topic ARN (uses default if None)
            message_attributes: Optional message attributes
            
        Returns:
            Dictionary with send result
        """
        topic_arn = topic_arn or settings.SNS_TOPIC_ARN
        
        if not topic_arn:
            logger.warning("SNS topic ARN not configured")
            return self._mock_sns_notification(message)
        
        client = self._get_sns_client()
        if not client:
            logger.warning("SNS client not available, returning mock response")
            return self._mock_sns_notification(message)
        
        try:
            params = {
                'TopicArn': topic_arn,
                'Message': message
            }
            
            if subject:
                params['Subject'] = subject
            
            if message_attributes:
                params['MessageAttributes'] = {
                    k: {'DataType': 'String', 'StringValue': str(v)}
                    for k, v in message_attributes.items()
                }
            
            response = client.publish(**params)
            
            return {
                "success": True,
                "message_id": response.get('MessageId'),
                "topic_arn": topic_arn
            }
            
        except ClientError as e:
            logger.error(f"SNS publish failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        except NoCredentialsError:
            logger.error("AWS credentials not available")
            return self._mock_sns_notification(message)
    
    async def publish_iot_message(
        self,
        topic: str,
        payload: Dict[str, Any],
        qos: int = 0
    ) -> Dict[str, Any]:
        """
        Publish message to AWS IoT Core topic.
        
        Args:
            topic: IoT topic name
            payload: Message payload dictionary
            qos: Quality of Service (0 or 1)
            
        Returns:
            Dictionary with publish result
        """
        if not settings.AWS_IOT_ENDPOINT:
            logger.warning("AWS IoT endpoint not configured")
            return self._mock_iot_publish(topic)
        
        client = self._get_iot_client()
        if not client:
            logger.warning("IoT client not available, returning mock response")
            return self._mock_iot_publish(topic)
        
        try:
            response = client.publish(
                topic=topic,
                qos=qos,
                payload=json.dumps(payload)
            )
            
            return {
                "success": True,
                "topic": topic,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except ClientError as e:
            logger.error(f"IoT publish failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
        except NoCredentialsError:
            logger.error("AWS credentials not available")
            return self._mock_iot_publish(topic)
    
    async def get_iot_shadow(self, thing_name: str) -> Dict[str, Any]:
        """
        Get device shadow from AWS IoT Core.
        
        Args:
            thing_name: IoT thing name
            
        Returns:
            Dictionary with shadow data
        """
        client = self._get_iot_client()
        if not client:
            return {"success": False, "error": "IoT client not available"}
        
        try:
            response = client.get_thing_shadow(thingName=thing_name)
            shadow = json.loads(response['payload'].read())
            return {
                "success": True,
                "shadow": shadow
            }
        except ClientError as e:
            logger.error(f"Get IoT shadow failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _mock_s3_upload(self, key: str) -> Dict[str, Any]:
        """Mock S3 upload response for development."""
        return {
            "success": True,
            "bucket": "mock-bucket",
            "key": key,
            "url": f"https://mock-bucket.s3.amazonaws.com/{key}",
            "size": 1024,
            "mock": True
        }
    
    def _mock_sns_notification(self, message: str) -> Dict[str, Any]:
        """Mock SNS notification response for development."""
        logger.info(f"[MOCK SNS] Would send notification: {message}")
        return {
            "success": True,
            "message_id": "mock-message-id-123",
            "topic_arn": "arn:aws:sns:us-east-1:123456789:mock-topic",
            "mock": True
        }
    
    def _mock_iot_publish(self, topic: str) -> Dict[str, Any]:
        """Mock IoT publish response for development."""
        logger.info(f"[MOCK IoT] Would publish to topic: {topic}")
        return {
            "success": True,
            "topic": topic,
            "timestamp": datetime.utcnow().isoformat(),
            "mock": True
        }
